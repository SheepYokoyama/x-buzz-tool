import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveXAccountId } from '@/lib/x-client';
import { getActiveThreadsAccountId } from '@/lib/threads-client';
import { deletePostImages } from '@/lib/post-storage';
import { isCrossAccountDuplicate } from '@/lib/post-safety';
import {
  verifyThothApiKey,
  findUserIdByEmail,
  ingestExternalImage,
  sendThothWebhook,
  weightedPostLength,
  X_MAX_WEIGHTED_LENGTH,
  THREADS_MAX_LENGTH,
} from '@/lib/thoth-partner';
import type {
  PartnerMeta,
  ScheduledChunk,
  ScheduledPostPayloadV1,
} from '@/lib/scheduled-post-payload';

const MAX_THREAD_CHUNKS = 10;
const MAX_MEDIA_URLS = 4; // X の 1 投稿あたり画像上限に合わせる

/** リクエストボディ（Thoth × Expresso 連携仕様書 v1.0 §2） */
interface ThothScheduleRequest {
  thothPostId?: unknown;
  memberEmail?: unknown;
  platform?: unknown;
  accountId?: unknown;
  body?: unknown;
  thread?: unknown;
  mediaUrls?: unknown;
  scheduledAt?: unknown;
  purpose?: unknown;
  campaignId?: unknown;
  trackingUrl?: unknown;
  contentVersion?: unknown;
}

function badRequest(message: string, status = 422) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/v1/scheduled-posts
 * Thoth からの予約投稿受け入れ（仕様書 §2）。
 *
 * 認証: Authorization: Bearer <THOTH_API_KEY>（システム間 1 キー）
 * 冪等性: 同一 thothPostId の再送は新規予約を作らず、既存の expressoPostId を 200 で返す。
 * 409: 同一会員の同一文面の未消化予約、または他アカウントとの同一文面（BAN 回避ポリシー）。
 * 422: バリデーションエラー（本文長超過・アカウント未接続・メディア不正 等）。
 */
export async function POST(req: Request) {
  const auth = verifyThothApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let json: ThothScheduleRequest;
  try {
    json = await req.json();
  } catch {
    return badRequest('リクエストボディが JSON として解釈できません', 400);
  }

  // ── 必須フィールド ────────────────────────────
  const thothPostId = typeof json.thothPostId === 'string' ? json.thothPostId.trim() : '';
  if (!thothPostId) return badRequest('thothPostId は必須です');

  const memberEmail = typeof json.memberEmail === 'string' ? json.memberEmail.trim() : '';
  if (!memberEmail) return badRequest('memberEmail は必須です');

  const platform = json.platform === 'x' || json.platform === 'threads' ? json.platform : null;
  if (!platform) return badRequest('platform は "x" または "threads" を指定してください');

  // ── 本文（body / thread は排他） ──────────────
  const hasBody = typeof json.body === 'string' && json.body.trim().length > 0;
  const rawThread = Array.isArray(json.thread) ? json.thread : null;
  const hasThread = !!rawThread && rawThread.length > 0;
  if (hasBody === hasThread) {
    return badRequest('body（単発）と thread（スレッド）はどちらか一方を指定してください');
  }
  let texts: string[];
  if (hasThread) {
    texts = rawThread!.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
    if (texts.length === 0) return badRequest('thread の各要素は空でない文字列にしてください');
    if (texts.length > MAX_THREAD_CHUNKS) {
      return badRequest(`thread は最大 ${MAX_THREAD_CHUNKS} 件までです（${texts.length} 件指定）`);
    }
  } else {
    texts = [(json.body as string).trim()];
  }

  // ── 本文長チェック ────────────────────────────
  for (let i = 0; i < texts.length; i++) {
    if (platform === 'x') {
      const len = weightedPostLength(texts[i]);
      if (len > X_MAX_WEIGHTED_LENGTH) {
        return badRequest(`${i + 1}件目の本文が X の上限を超えています（換算 ${len} / 上限 ${X_MAX_WEIGHTED_LENGTH}）`);
      }
    } else {
      if (texts[i].length > THREADS_MAX_LENGTH) {
        return badRequest(`${i + 1}件目の本文が Threads の上限（${THREADS_MAX_LENGTH}文字）を超えています`);
      }
    }
  }

  // ── scheduledAt ───────────────────────────────
  const rawScheduledAt = typeof json.scheduledAt === 'string' ? json.scheduledAt : '';
  const scheduledAt = new Date(rawScheduledAt);
  if (!rawScheduledAt || isNaN(scheduledAt.getTime())) {
    return badRequest('scheduledAt は ISO8601 形式で指定してください');
  }
  if (scheduledAt.getTime() < Date.now()) {
    return badRequest('scheduledAt が過去日時です');
  }
  if (scheduledAt.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) {
    return badRequest('scheduledAt が1年以上先です');
  }

  // ── mediaUrls ─────────────────────────────────
  let mediaUrls: string[] = [];
  if (json.mediaUrls !== undefined && json.mediaUrls !== null) {
    if (!Array.isArray(json.mediaUrls)) return badRequest('mediaUrls は配列で指定してください');
    mediaUrls = json.mediaUrls.map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
    if (mediaUrls.length > MAX_MEDIA_URLS) {
      return badRequest(`mediaUrls は最大 ${MAX_MEDIA_URLS} 件までです`);
    }
    for (const u of mediaUrls) {
      if (!/^https?:\/\//i.test(u)) return badRequest(`mediaUrls に不正な URL が含まれています: ${u}`);
    }
  }

  // ── 会員突合（memberEmail → user_id）──────────
  let userId: string | null;
  try {
    userId = await findUserIdByEmail(memberEmail);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '会員照会に失敗しました';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (!userId) {
    return badRequest(`該当会員が Expresso に登録されていません: ${memberEmail}`, 404);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any;

  // ── 冪等性: 同一 thothPostId は既存を 200 で返す（仕様書 §2 最重要）──
  const { data: existing, error: idemError } = await admin
    .from('scheduled_posts')
    .select('id, status')
    .eq('user_id', userId)
    .eq('payload->partner->>thothPostId', thothPostId)
    .order('created_at', { ascending: true })
    .limit(1);
  if (idemError) {
    return NextResponse.json({ error: `冪等性チェックに失敗しました: ${idemError.message}` }, { status: 500 });
  }
  if (Array.isArray(existing) && existing.length > 0) {
    return NextResponse.json(
      { expressoPostId: existing[0].id, status: existing[0].status },
      { status: 200 },
    );
  }

  // ── アカウント接続確認 ────────────────────────
  const accountId =
    platform === 'x' ? await getActiveXAccountId(userId) : await getActiveThreadsAccountId(userId);
  if (!accountId) {
    return badRequest(`この会員は ${platform === 'x' ? 'X' : 'Threads'} アカウントを Expresso に接続していません`);
  }
  // accountId が指定された場合は接続中アカウントと一致するか検証する
  // （Expresso は現状 1 会員 × 1 プラットフォーム 1 アカウントのため、不一致は誤配信として拒否）
  if (typeof json.accountId === 'string' && json.accountId.trim() && json.accountId.trim() !== accountId) {
    return badRequest(`accountId が接続中のアカウントと一致しません（接続中: ${accountId}）`);
  }

  // ── 重複ポリシーチェック（409）────────────────
  const legacyContent = texts.join('\n\n---\n\n');

  // 同一会員の未消化予約に同一文面が既にある → 二重登録の疑い
  const { data: sameUserDup } = await admin
    .from('scheduled_posts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .eq('content', legacyContent)
    .limit(1);
  if (Array.isArray(sameUserDup) && sameUserDup.length > 0) {
    return NextResponse.json(
      { error: '同一内容の予約が既に存在します（二重登録防止のため拒否しました）', conflictWith: sameUserDup[0].id },
      { status: 409 },
    );
  }

  // 他会員のアカウントと同一文面 → 「同一文面の複数アカウント横展開」（スパム/CIB 認定の最重要リスク）
  if (await isCrossAccountDuplicate(userId, legacyContent)) {
    return NextResponse.json(
      { error: '同一文面が他のアカウントで直近に投稿・予約されています。複数アカウントへの同一文面展開はスパム認定（凍結）リスクのため受け付けられません。文面を変えて再送してください。' },
      { status: 409 },
    );
  }

  // ── メディア取り込み（失敗時は巻き戻し）────────
  const chunks: ScheduledChunk[] = texts.map((t) => ({ text: t, images: [] }));
  const uploadedPaths: string[] = [];
  try {
    for (const url of mediaUrls) {
      const img = await ingestExternalImage(userId, url);
      uploadedPaths.push(img.path);
      // 仕様書の mediaUrls はフラット配列のため、すべて先頭ポストに添付する
      chunks[0].images.push(img);
    }
  } catch (err) {
    if (uploadedPaths.length > 0) await deletePostImages(uploadedPaths);
    const msg = err instanceof Error ? err.message : 'メディア取り込みに失敗しました';
    return badRequest(msg);
  }

  // ── payload 組立 & INSERT ─────────────────────
  const partner: PartnerMeta = {
    source: 'thoth',
    thothPostId,
    memberEmail,
    ...(typeof json.purpose === 'string' && json.purpose ? { purpose: json.purpose } : {}),
    ...(typeof json.campaignId === 'string' && json.campaignId ? { campaignId: json.campaignId } : {}),
    ...(typeof json.trackingUrl === 'string' && json.trackingUrl ? { trackingUrl: json.trackingUrl } : {}),
    ...(typeof json.contentVersion === 'number' ? { contentVersion: json.contentVersion } : {}),
  };
  const payload: ScheduledPostPayloadV1 = {
    version: 1,
    mode: texts.length > 1 ? 'thread' : 'none',
    platforms: [platform],
    numbering: false,
    chunks,
    partner,
  };

  const { data: inserted, error: insertError } = await admin
    .from('scheduled_posts')
    .insert({
      content: legacyContent,
      scheduled_at: scheduledAt.toISOString(),
      tags: [],
      status: 'scheduled',
      user_id: userId,
      x_account_id: accountId,
      payload,
    })
    .select('id, status, created_at')
    .single();

  if (insertError || !inserted) {
    if (uploadedPaths.length > 0) await deletePostImages(uploadedPaths);
    return NextResponse.json(
      { error: insertError?.message ?? '予約の保存に失敗しました' },
      { status: 500 },
    );
  }

  // ── 冪等性の二次確認（同時再送レース対策）──────
  // thothPostId に一意制約が無いため、同時到達した同一キーは両方 INSERT され得る。
  // INSERT 後に最古の行を正とし、自分が最古でなければ自行を取り下げて既存を返す。
  const { data: winners } = await admin
    .from('scheduled_posts')
    .select('id, status')
    .eq('user_id', userId)
    .eq('payload->partner->>thothPostId', thothPostId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1);
  const winner = Array.isArray(winners) ? winners[0] : null;
  if (winner && winner.id !== inserted.id) {
    await admin.from('scheduled_posts').delete().eq('id', inserted.id).eq('user_id', userId);
    if (uploadedPaths.length > 0) await deletePostImages(uploadedPaths);
    return NextResponse.json({ expressoPostId: winner.id, status: winner.status }, { status: 200 });
  }

  // ── 状態通知 Webhook（post.scheduled）──────────
  // 送達失敗しても登録自体は成立している（Thoth は 201 レスポンスでも確認できる）
  await sendThothWebhook(
    { event: 'post.scheduled', thothPostId, expressoPostId: inserted.id },
    { attempts: 2 },
  );

  return NextResponse.json(
    { expressoPostId: inserted.id, status: 'scheduled' },
    { status: 201 },
  );
}
