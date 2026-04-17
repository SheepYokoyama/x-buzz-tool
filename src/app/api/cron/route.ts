import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveXClient, getActiveXAccountId } from '@/lib/x-client';

export const maxDuration = 60;

// ─────────────────────────────────────────────
// Spam対策の既定値。X の spam 検知を避けるため、機械的な定間隔を避けつつ
// 1 実行あたりの投稿数を絞る。必要に応じて env で上書き可能。
//   CRON_MAX_PER_RUN        : 1 実行で処理する最大件数（既定: 2）
//   CRON_WAIT_SECONDS       : 投稿間の待機秒数ベース（既定: 15）
//   CRON_JITTER_SECONDS     : 待機秒数のジッター（±秒, 既定: 3）
//   CRON_EXTRA_DELAY_SECONDS: 各投稿前に毎回追加される 0 以上のランダム遅延（既定: 5）
//                             → 規則的な間隔をさらに崩すための追加ディレイ
//   CRON_MAX_RUNTIME_MS     : 早期終了の上限（既定: 50_000, Vercel 60s 制約の内側）
// ─────────────────────────────────────────────
const MAX_PER_RUN         = Number(process.env.CRON_MAX_PER_RUN         ?? 2);
const WAIT_SECONDS        = Number(process.env.CRON_WAIT_SECONDS        ?? 15);
const JITTER_SECONDS      = Number(process.env.CRON_JITTER_SECONDS      ?? 3);
const EXTRA_DELAY_SECONDS = Number(process.env.CRON_EXTRA_DELAY_SECONDS ?? 5);
const MAX_RUNTIME_MS      = Number(process.env.CRON_MAX_RUNTIME_MS      ?? 50_000);

function isAuthorized(req: Request): boolean {
  // localhost からのリクエストは開発用としてスキップ
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

type PostResult =
  | { id: string; status: 'published'; tweetId: string; url: string }
  | { id: string; status: 'skipped'; reason: string }
  | { id: string; status: 'failed'; error: string };

/** 投稿前に毎回追加で加える不規則ディレイ（ms）。0 〜 EXTRA_DELAY_SECONDS の一様分布 */
function extraDelayMs(): number {
  return Math.round(Math.random() * EXTRA_DELAY_SECONDS * 1000);
}

/** 次回投稿までのウェイト時間（ms）。ベース + ±ジッター + 追加ランダム遅延 */
function nextDelayMs(): number {
  const base   = WAIT_SECONDS * 1000;
  const jitter = (Math.random() * 2 - 1) * JITTER_SECONDS * 1000; // ±JITTER
  return Math.max(0, Math.round(base + jitter)) + extraDelayMs();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 配列をランダム順に並べ替える（公平性のため） */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * GET /api/cron
 *
 * Vercel Cron から定期的に呼ばれ、scheduled_at が過去の予約投稿を X に送信する。
 *
 * Spam対策:
 * - 1 実行あたり最大 MAX_PER_RUN 件まで（既定: 2）
 * - 投稿間に WAIT_SECONDS 秒 ± JITTER_SECONDS 秒 の可変ウェイト（既定: 15±3秒）
 * - ユーザーごとに処理を分散（公平性・一極集中の抑制）
 * - MAX_RUNTIME_MS を超えそうなら残りは次回 cron に繰越（deferred）
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabase  = getSupabaseAdmin();

  // 投稿期限を過ぎた予約済み投稿を取得（古い順）
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
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

  // ユーザー単位でラウンドロビン用のキューを組み立てる
  //   1) user_id ごとにグループ化（scheduled_at 昇順を維持）
  //   2) グループ順をシャッフルし、毎実行で特定ユーザーに偏らないようにする
  //   3) 各グループの先頭から 1 件ずつ取り出して交互に並べる
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
      if (next) {
        queue.push(next);
        remaining = true;
      }
    }
  }

  // ユーザーごとの X クライアント・アカウントIDをキャッシュ（投稿所有者のアカウントで配信する）
  const xClientCache = new Map<string, Awaited<ReturnType<typeof getActiveXClient>>>();
  const accountIdCache = new Map<string, string | null>();

  const results: PostResult[] = [];
  let processed = 0;

  for (const post of queue) {
    if (processed >= MAX_PER_RUN) break;

    // Vercel の maxDuration に達する前に打ち切る
    if (Date.now() - startedAt >= MAX_RUNTIME_MS) {
      console.log(`[cron] runtime budget reached (${Date.now() - startedAt}ms), defer remaining`);
      break;
    }

    // 投稿前のウェイト
    //   初回: 0〜EXTRA_DELAY_SECONDS の小さなランダム遅延（完全即時開始を避ける）
    //   以降: ベース待機 + ±ジッター + 追加ランダム遅延
    const delay = processed === 0 ? extraDelayMs() : nextDelayMs();
    if (delay > 0) {
      console.log(`[cron] wait ${delay}ms before tweet #${processed + 1}`);
      await sleep(delay);
    }

    const postUserId = (post as { user_id?: string | null }).user_id ?? null;
    if (!postUserId) {
      results.push({ id: post.id, status: 'skipped', reason: 'post has no user_id' });
      processed++;
      continue;
    }

    // 投稿所有者の X クライアント／アカウントIDを取得（キャッシュ利用）
    if (!xClientCache.has(postUserId)) {
      const [client, accountId] = await Promise.all([
        getActiveXClient(postUserId),
        getActiveXAccountId(postUserId),
      ]);
      xClientCache.set(postUserId, client);
      accountIdCache.set(postUserId, accountId);
    }
    const xClient = xClientCache.get(postUserId) ?? null;
    const activeAccountId = accountIdCache.get(postUserId) ?? null;

    // X API 未設定: スキップ（ステータスは変えない）
    if (!xClient) {
      results.push({ id: post.id, status: 'skipped', reason: 'X API not configured for user' });
      processed++;
      continue;
    }

    try {
      const { data: tweet } = await xClient.v2.tweet(post.content as string);
      const tweetId = tweet.id;
      const url     = `https://x.com/i/web/status/${tweetId}`;

      const { error: updateError } = await supabase
        .from('scheduled_posts')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          status:        'published',
          published_at:  new Date().toISOString(),
          x_post_id:     tweetId,
          x_post_url:    url,
          x_account_id:  activeAccountId,
        } as any)
        .eq('id', post.id);

      if (updateError) {
        console.error(`[cron] DB update failed for ${post.id}:`, updateError.message);
      }

      results.push({ id: post.id, status: 'published', tweetId, url });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown error';
      console.error(`[cron] Tweet failed for ${post.id}:`, message);

      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed' })
        .eq('id', post.id);

      results.push({ id: post.id, status: 'failed', error: message });
    }

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
