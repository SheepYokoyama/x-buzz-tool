/**
 * 予約投稿の実行ランナー（cron から呼ばれる）
 *
 * 即時投稿 API（/api/x/thread, /api/threads/thread）と機能は重複するが、
 * あちらは HTTP リクエスト経由 + ユーザー認証経路に組み込まれているため、
 * サーバー内コードから直接呼ぶには適さない。
 *
 * ここでは userId と payload を受け取って X / Threads に投稿し、
 * プラットフォーム別の結果と最終エラーを返す。
 * 一方の失敗が他方の投稿を妨げないよう、両プラットフォームを独立に処理する。
 */
import { getActiveXClient, getActiveXAccountId } from '@/lib/x-client';
import {
  getActiveThreadsAccessToken,
  postThreadsSingle,
} from '@/lib/threads-client';
import {
  getActiveInstagramAccessToken,
  getActiveInstagramAccountId,
  postInstagramSingle,
} from '@/lib/instagram-client';
import type {
  ScheduledPostPayload,
  ScheduledPostResultItem,
  ScheduledPostResults,
} from '@/lib/scheduled-post-payload';

/** chunk 順に投稿する X 側の処理 */
async function runX(
  userId: string,
  payload: ScheduledPostPayload,
): Promise<{ items: ScheduledPostResultItem[]; error?: string; accountId: string | null }> {
  const client = await getActiveXClient(userId);
  if (!client) {
    return { items: [], error: 'X API の認証情報が見つかりません', accountId: null };
  }
  const accountId = await getActiveXAccountId(userId);

  const items: ScheduledPostResultItem[] = [];
  let lastId: string | undefined;

  for (let i = 0; i < payload.chunks.length; i++) {
    const chunk = payload.chunks[i];
    // 画像があれば publicUrl から取得して uploadMedia
    const mediaIds: string[] = [];
    for (const img of chunk.images) {
      try {
        const r = await fetch(img.publicUrl);
        if (!r.ok) throw new Error(`fetch HTTP ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        const contentType = r.headers.get('content-type') ?? 'image/jpeg';
        const id = await client.v1.uploadMedia(buf, { mimeType: contentType });
        mediaIds.push(id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { items, error: `chunk ${i + 1} の画像アップロードに失敗: ${msg}`, accountId };
      }
    }

    const params: Record<string, unknown> = {};
    if (payload.mode === 'thread' && lastId) params.reply = { in_reply_to_tweet_id: lastId };
    if (mediaIds.length > 0)                 params.media = { media_ids: mediaIds };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await client.v2.tweet(chunk.text, params as any);
      const tweetId = data.id;
      const url = `https://x.com/i/web/status/${tweetId}`;
      items.push({ postId: tweetId, url });
      lastId = tweetId;
    } catch (err: unknown) {
      const apiErr = err as { data?: { detail?: string; errors?: { message?: string }[] }; message?: string };
      const detail =
        apiErr.data?.detail ??
        apiErr.data?.errors?.[0]?.message ??
        (err instanceof Error ? err.message : 'unknown error');
      return { items, error: `chunk ${i + 1}: ${detail}`, accountId };
    }
  }

  return { items, accountId };
}

/** chunk 順に投稿する Threads 側の処理 */
async function runThreads(
  userId: string,
  payload: ScheduledPostPayload,
): Promise<{ items: ScheduledPostResultItem[]; error?: string }> {
  const accessToken = await getActiveThreadsAccessToken(userId);
  if (!accessToken) return { items: [], error: 'Threads API の認証情報が見つかりません' };

  const items: ScheduledPostResultItem[] = [];
  let lastId: string | undefined;

  for (let i = 0; i < payload.chunks.length; i++) {
    const chunk = payload.chunks[i];
    const imageUrls = chunk.images.map((img) => img.publicUrl);
    try {
      const result = await postThreadsSingle({
        accessToken,
        text: chunk.text,
        replyToId: payload.mode === 'thread' ? lastId : undefined,
        imageUrls,
      });
      const url = result.permalink ?? 'https://www.threads.net/';
      items.push({ postId: result.id, url });
      lastId = result.id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      return { items, error: `chunk ${i + 1}: ${msg}` };
    }
  }
  return { items };
}

/**
 * Instagram 側の処理（単一投稿）。
 * Instagram はリプライ連結が無いため、全 chunk のテキストを連結して1キャプションにし、
 * 全 chunk の画像を最大10枚まで集約して1投稿（カルーセル）として公開する。
 * 画像が1枚も無い場合は投稿不可（Instagram は画像必須）。
 */
async function runInstagram(
  userId: string,
  payload: ScheduledPostPayload,
): Promise<{ items: ScheduledPostResultItem[]; error?: string; accountId: string | null }> {
  const accessToken = await getActiveInstagramAccessToken(userId);
  if (!accessToken) {
    return { items: [], error: 'Instagram API の認証情報が見つかりません', accountId: null };
  }
  const accountId = await getActiveInstagramAccountId(userId);

  const caption = payload.chunks.map((c) => c.text).join('\n\n').trim();
  const imageUrls = payload.chunks
    .flatMap((c) => c.images.map((img) => img.publicUrl))
    .slice(0, 10);

  if (imageUrls.length === 0) {
    return { items: [], error: 'Instagram は画像が1枚以上必要です', accountId };
  }

  try {
    const result = await postInstagramSingle({ accessToken, caption, imageUrls });
    const url = result.permalink ?? 'https://www.instagram.com/';
    return { items: [{ postId: result.id, url }], accountId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return { items: [], error: msg, accountId };
  }
}

/**
 * 予約投稿を実行する。プラットフォームごとに独立して処理し、
 * 一方が失敗してももう一方には反映する。
 *
 * 戻り値:
 *   - results: プラットフォーム別の結果（DB の payload.results にそのまま保存）
 *   - status:  'published' / 'failed' / 'partial'（X/Threads 両方の状態を集約）
 *   - xAccountId: X 投稿に使ったアカウント UUID（DB の x_account_id 列更新用）
 */
export async function runScheduledPost(params: {
  userId: string;
  payload: ScheduledPostPayload;
}): Promise<{
  results: ScheduledPostResults;
  status: 'published' | 'failed' | 'partial';
  xAccountId: string | null;
}> {
  const { userId, payload } = params;
  const wantsX         = payload.platforms.includes('x');
  const wantsThreads   = payload.platforms.includes('threads');
  const wantsInstagram = payload.platforms.includes('instagram');

  const [x, t, ig] = await Promise.all([
    wantsX         ? runX(userId, payload)         : Promise.resolve(null),
    wantsThreads   ? runThreads(userId, payload)   : Promise.resolve(null),
    wantsInstagram ? runInstagram(userId, payload) : Promise.resolve(null),
  ]);

  const errors: Partial<Record<'x' | 'threads' | 'instagram', string>> = {};
  if (x?.error)  errors.x = x.error;
  if (t?.error)  errors.threads = t.error;
  if (ig?.error) errors.instagram = ig.error;

  const results: ScheduledPostResults = {
    x:         x  ? x.items  : null,
    threads:   t  ? t.items  : null,
    instagram: ig ? ig.items : null,
    errors:  Object.keys(errors).length > 0 ? errors : undefined,
    executedAt: new Date().toISOString(),
  };

  // ステータス判定:
  //   - 期待した全プラットフォームで少なくとも1件成功 → published
  //   - どのプラットフォームでも0件成功 → failed
  //   - 一方は成功・一方は失敗 or 部分成功 → partial
  // Instagram は単一投稿のため期待件数は常に1件。
  const totalExpected = (wantsX ? 1 : 0) + (wantsThreads ? 1 : 0) + (wantsInstagram ? 1 : 0);
  const fullSuccess =
    (!wantsX         || (x?.items.length === payload.chunks.length && !x.error)) &&
    (!wantsThreads   || (t?.items.length === payload.chunks.length && !t.error)) &&
    (!wantsInstagram || ((ig?.items.length ?? 0) === 1 && !ig?.error));
  const anySuccess  = (x?.items.length ?? 0) > 0 || (t?.items.length ?? 0) > 0 || (ig?.items.length ?? 0) > 0;

  let status: 'published' | 'failed' | 'partial';
  if (fullSuccess)        status = 'published';
  else if (!anySuccess)   status = 'failed';
  else                    status = 'partial';

  // partial は scheduled_posts.status の enum に存在しないため、呼び出し側で
  // どちらに丸めるかは判断する。ここでは情報として返す。
  void totalExpected;

  return { results, status, xAccountId: x?.accountId ?? null };
}
