import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveXClient, getActiveXAccountId } from '@/lib/x-client';
import { runScheduledPost } from '@/lib/post-runner';
import { deletePostImages } from '@/lib/post-storage';
import {
  isPayloadV1,
  collectImagePaths,
  type ScheduledPostPayloadV1,
} from '@/lib/scheduled-post-payload';
import { isFullyPublished, checkDailyCap } from '@/lib/post-safety';

export const maxDuration = 60;

// ─────────────────────────────────────────────
// Spam対策の既定値。X の spam 検知を避けるため、機械的な定間隔を避けつつ
// 1 実行あたりの投稿数を絞る。必要に応じて env で上書き可能。
//   CRON_MAX_PER_RUN        : 1 実行で処理する最大件数（既定: 2）
//   CRON_WAIT_SECONDS       : 投稿間の待機秒数ベース（既定: 15）
//   CRON_JITTER_SECONDS     : 待機秒数のジッター（±秒, 既定: 3）
//   CRON_EXTRA_DELAY_SECONDS: 各投稿前に毎回追加される 0 以上のランダム遅延（既定: 5）
//   CRON_MAX_RUNTIME_MS     : 早期終了の上限（既定: 50_000, Vercel 60s 制約の内側）
// ─────────────────────────────────────────────
const MAX_PER_RUN         = Number(process.env.CRON_MAX_PER_RUN         ?? 2);
const WAIT_SECONDS        = Number(process.env.CRON_WAIT_SECONDS        ?? 15);
const JITTER_SECONDS      = Number(process.env.CRON_JITTER_SECONDS      ?? 3);
const EXTRA_DELAY_SECONDS = Number(process.env.CRON_EXTRA_DELAY_SECONDS ?? 5);
const MAX_RUNTIME_MS      = Number(process.env.CRON_MAX_RUNTIME_MS      ?? 50_000);

// claim（実行前ロック）が取り残されたまま finalize されなかった行を失敗扱いに倒すまでの猶予。
// 1回の cron 実行は maxDuration(60s) で必ず終わるため、これを十分に超えた時間 locked_at が
// 立ったまま status='scheduled' の行は「投稿途中で関数が落ちた」とみなせる。再投稿はしない。
const STALE_LOCK_MS = Number(process.env.CRON_STALE_LOCK_MS ?? 5 * 60_000);

// 投稿処理の「これまでに必ず戻る」締切（cron 起動からの ms）。maxDuration(60s) の手前に置く。
// 各チャンクは開始前に「自分の最悪所要がこの締切に収まるか」を確認し、収まらなければ停止して
// 続きを次回 cron に resume する（関数強制終了で投稿途中に落ちるのを防ぐ）。
const POST_BUDGET_MS = Number(process.env.CRON_POST_BUDGET_MS ?? 54_000);

// 1 行あたりの resume（持ち越し）上限。これを超えたら投稿しきれなくても確定させる（無限ループ防止）。
const MAX_RESUME_ATTEMPTS = Number(process.env.CRON_MAX_RESUME_ATTEMPTS ?? 5);

function isAuthorized(req: Request): boolean {
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

type PostResult =
  | { id: string; status: 'published'; mode: 'legacy' | 'payload'; published: number }
  | { id: string; status: 'failed';    mode: 'legacy' | 'payload'; error: string }
  | { id: string; status: 'skipped';   reason: string };

/**
 * 投稿の「前」に行を確保（claim）する。
 * status='scheduled' かつ locked_at IS NULL の行のみを対象にした原子的 UPDATE。
 * 1行更新できれば確保成功。0行なら他の cron 実行が既に確保済み（or 別状態）→ スキップすべき。
 *
 * これにより、投稿後の finalize 更新前に関数がタイムアウトで強制終了しても、
 * 行は 'scheduled' に戻らない（locked_at が立つ）ため二度と再投稿されない。
 * cron 実行が重なった場合の二重取得も防ぐ。
 */
async function claimPost(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_posts')
    .update({ locked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'scheduled')
    .is('locked_at', null)
    .select('id');
  if (error) {
    console.error('[cron] claim failed:', id, error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * claim 済みのまま finalize されず取り残された行（投稿途中で関数が落ちたケース）を
 * 'failed' に倒す。再投稿はしない（重複投稿を防ぐのが最優先）。
 * 投稿が実際には成立していた可能性があるため、運用側で payload.results を確認できるよう
 * status のみ更新する。
 */
async function recoverStaleLocks(): Promise<number> {
  const threshold = new Date(Date.now() - STALE_LOCK_MS).toISOString();
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_posts')
    .update({ status: 'failed' })
    .eq('status', 'scheduled')
    .not('locked_at', 'is', null)
    .lt('locked_at', threshold)
    .select('id');
  if (error) {
    console.error('[cron] stale-lock recovery failed:', error.message);
    return 0;
  }
  const n = Array.isArray(data) ? data.length : 0;
  if (n > 0) console.warn(`[cron] recovered ${n} stale-locked post(s) -> failed`);
  return n;
}

function extraDelayMs(): number {
  return Math.round(Math.random() * EXTRA_DELAY_SECONDS * 1000);
}
function nextDelayMs(): number {
  const base   = WAIT_SECONDS * 1000;
  const jitter = (Math.random() * 2 - 1) * JITTER_SECONDS * 1000;
  return Math.max(0, Math.round(base + jitter)) + extraDelayMs();
}
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 旧仕様（payload なし）: content をそのまま X 単独投稿。
 * 新規予約は全て payload 付きで作られるため、これは過去データ用フォールバック。
 */
async function processLegacy(
  post: { id: string; user_id: string | null; content: string },
): Promise<PostResult> {
  const userId = post.user_id;
  if (!userId) return { id: post.id, status: 'skipped', reason: 'post has no user_id' };

  const [client, accountId] = await Promise.all([
    getActiveXClient(userId),
    getActiveXAccountId(userId),
  ]);
  if (!client) return { id: post.id, status: 'skipped', reason: 'X API not configured for user' };

  // 構造的セーフティ: 24h 投稿上限の最終ブレーキ（旧仕様の単独 X 投稿）
  const cap = await checkDailyCap(userId, 'x', 1);
  if (!cap.ok) {
    const supabase = getSupabaseAdmin();
    await supabase.from('scheduled_posts').update({ status: 'failed' }).eq('id', post.id);
    return { id: post.id, status: 'failed', mode: 'legacy', error: cap.error ?? 'daily cap reached' };
  }

  const supabase = getSupabaseAdmin();
  try {
    const { data: tweet } = await client.v2.tweet(post.content);
    const url = `https://x.com/i/web/status/${tweet.id}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('scheduled_posts').update({
      status:        'published',
      published_at:  new Date().toISOString(),
      x_post_id:     tweet.id,
      x_post_url:    url,
      x_account_id:  accountId,
    } as any).eq('id', post.id);
    return { id: post.id, status: 'published', mode: 'legacy', published: 1 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    await supabase.from('scheduled_posts').update({ status: 'failed' }).eq('id', post.id);
    return { id: post.id, status: 'failed', mode: 'legacy', error: message };
  }
}

/**
 * 新仕様（payload V1）: post-runner で X/Threads それぞれを並列実行し、
 * 結果を payload.results に詰めて DB を更新する。
 * status の決定:
 *   - 全プラットフォーム完全成功 → 'published'
 *   - 一方は成功・一方は失敗 or 部分成功 → 'published'（DB の enum 上限のため）。
 *     詳細は payload.results.errors で参照可能。
 *   - どこも成功しなかった → 'failed'
 * 投稿成立後（成否問わず）画像を post-uploads から削除する（時刻過ぎても永久に残らない）。
 */
async function processPayload(
  post: { id: string; user_id: string | null; payload: ScheduledPostPayloadV1 },
  deadline: number,
): Promise<PostResult> {
  const userId = post.user_id;
  if (!userId) return { id: post.id, status: 'skipped', reason: 'post has no user_id' };

  const supabase = getSupabaseAdmin();

  // 完了ガード（第2防御線）: 既に全チャンク投稿済みの行は二度と投稿しない。
  // claim が主防御だが、万一 完了済みの行が再処理されても二重投稿を防ぐ。
  // ※ 部分投稿（続きあり）はここを通さず resume させる。
  if (isFullyPublished(post.payload)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('scheduled_posts')
      .update({ status: 'published' }).eq('id', post.id);
    console.warn(`[cron] skip already fully-published post ${post.id} (idempotency guard)`);
    return { id: post.id, status: 'skipped', reason: 'already fully published (idempotency guard)' };
  }

  const { results, status: runStatus, xAccountId, needsResume } = await runScheduledPost({
    userId,
    payload: post.payload,
    deadline,
  });

  // 公開URL/postId は X の最初のチャンクを代表値として x_post_id/x_post_url に格納
  const firstX = results.x?.[0];
  const publishedCount = (results.x?.length ?? 0) + (results.threads?.length ?? 0) + (results.instagram?.length ?? 0);

  // ── resume: 時間内に投稿しきれなかった → 続きを次回 cron に持ち越す ──
  //   status=scheduled に戻し、locked_at をクリアして再取得可能にする。
  //   投稿済みチャンクは results に保存済み → 次回はそこからスキップして再開（二重投稿しない）。
  //   画像はまだ残りチャンクで使うため削除しない／published_at もまだ立てない。
  if (needsResume) {
    const attempts = (post.payload.resumeAttempts ?? 0) + 1;
    const resumePayload: ScheduledPostPayloadV1 = { ...post.payload, results, resumeAttempts: attempts };

    if (attempts <= MAX_RESUME_ATTEMPTS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('scheduled_posts').update({
        status:    'scheduled',
        locked_at: null,
        payload:   resumePayload,
      }).eq('id', post.id);
      console.log(`[cron] post ${post.id} partial -> resume next run (attempt ${attempts}, ${publishedCount} posted)`);
      return { id: post.id, status: 'skipped', reason: `partial, resuming (attempt ${attempts}, ${publishedCount} posted)` };
    }
    // 再開上限に到達 → これ以上続けず確定（成立分があれば published 扱い）
    console.warn(`[cron] post ${post.id} exceeded resume attempts (${attempts}); finalizing`);
  }

  const dbStatus =
    runStatus === 'failed' ? 'failed' : 'published'; // partial も published 扱い（DB enum 制約）
  const updatePayload: ScheduledPostPayloadV1 = { ...post.payload, results };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase.from('scheduled_posts').update({
    status:       dbStatus,
    published_at: new Date().toISOString(),
    x_post_id:    firstX?.postId ?? null,
    x_post_url:   firstX?.url    ?? null,
    x_account_id: xAccountId ?? null,
    payload:      updatePayload,
  } as any).eq('id', post.id);

  // 画像 cleanup（best-effort）— 確定時のみ（resume 中は残りチャンクで使うため削除しない）
  const paths = collectImagePaths(post.payload);
  if (paths.length > 0) await deletePostImages(paths);

  if (dbStatus === 'failed') {
    const err = results.errors
      ? Object.entries(results.errors).map(([k, v]) => `${k}: ${v}`).join(' / ')
      : 'unknown error';
    return { id: post.id, status: 'failed', mode: 'payload', error: err };
  }
  return { id: post.id, status: 'published', mode: 'payload', published: publishedCount };
}

/**
 * GET /api/cron
 *
 * Vercel Cron から定期的に呼ばれ、scheduled_at が過去の予約投稿を実行する。
 * 新仕様 payload（X/Threads・スレッド分割・画像）と旧仕様（content のみ X 投稿）の両対応。
 *
 * Spam対策:
 * - 1 実行あたり最大 MAX_PER_RUN 件まで（既定: 2）
 * - 投稿間に WAIT_SECONDS ± JITTER_SECONDS 秒の可変ウェイト（既定: 15±3秒）
 * - ユーザーごとにラウンドロビン（公平性・一極集中の抑制）
 * - MAX_RUNTIME_MS を超えそうなら残りは次回 cron に繰越
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabase  = getSupabaseAdmin();

  // 投稿途中で落ちて claim されたまま残った行を先に失敗扱いに倒す（再投稿しない）
  await recoverStaleLocks();

  // 未確保（locked_at IS NULL）の期限到来分のみ対象にする。
  // 既に他の実行が確保済みの行や、claim 中の行は拾わない。
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .is('locked_at', null)
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('[cron] DB fetch error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const due = data ?? [];
  if (due.length === 0) {
    return NextResponse.json({ processed: 0, deferred: 0, results: [] });
  }

  // ユーザー単位ラウンドロビン
  const byUser = new Map<string, typeof due>();
  for (const p of due) {
    const key = (p.user_id ?? 'anonymous') as string;
    const list = byUser.get(key) ?? [];
    list.push(p);
    byUser.set(key, list);
  }
  const userQueues = shuffle(Array.from(byUser.values()));
  const queue: typeof due = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const q of userQueues) {
      const next = q.shift();
      if (next) { queue.push(next); remaining = true; }
    }
  }

  const results: PostResult[] = [];
  let processed = 0;

  for (const post of queue) {
    if (processed >= MAX_PER_RUN) break;
    if (Date.now() - startedAt >= MAX_RUNTIME_MS) {
      console.log(`[cron] runtime budget reached (${Date.now() - startedAt}ms), defer remaining`);
      break;
    }

    const row = post as unknown as {
      id: string;
      user_id: string | null;
      content: string;
      payload: unknown;
    };

    // ── 投稿の前に行を確保（claim）──
    // ここで status='scheduled' AND locked_at IS NULL を原子的に押さえる。
    // 確保できなければ他の実行が処理中 → スキップ（二重投稿防止）。
    const claimed = await claimPost(row.id);
    if (!claimed) {
      results.push({ id: row.id, status: 'skipped', reason: 'already claimed by another run' });
      continue;
    }

    const delay = processed === 0 ? extraDelayMs() : nextDelayMs();
    if (delay > 0) {
      console.log(`[cron] wait ${delay}ms before post #${processed + 1}`);
      await sleep(delay);
    }

    let result: PostResult;
    if (isPayloadV1(row.payload)) {
      result = await processPayload({
        id: row.id,
        user_id: row.user_id,
        payload: row.payload,
      }, startedAt + POST_BUDGET_MS);
    } else {
      result = await processLegacy({
        id: row.id,
        user_id: row.user_id,
        content: row.content,
      });
    }
    results.push(result);
    processed++;
  }

  const published = results.filter((r) => r.status === 'published').length;
  const failed    = results.filter((r) => r.status === 'failed').length;
  const skipped   = results.filter((r) => r.status === 'skipped').length;
  const deferred  = due.length - processed;

  console.log(`[cron] processed=${processed}/${due.length} published=${published} failed=${failed} skipped=${skipped} deferred=${deferred} elapsed=${Date.now() - startedAt}ms`);

  return NextResponse.json({
    processed,
    total:    due.length,
    deferred,
    published,
    failed,
    skipped,
    results,
    config:   { maxPerRun: MAX_PER_RUN, waitSeconds: WAIT_SECONDS, jitterSeconds: JITTER_SECONDS },
  });
}
