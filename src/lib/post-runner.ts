/**
 * 予約投稿の実行ランナー（cron から呼ばれる）
 *
 * 即時投稿 API（/api/x/thread, /api/threads/thread）と機能は重複するが、
 * あちらは HTTP リクエスト経由 + ユーザー認証経路に組み込まれているため、
 * サーバー内コードから直接呼ぶには適さない。
 *
 * ここでは userId と payload を受け取って X / Threads / Instagram に投稿し、
 * プラットフォーム別の結果と最終エラーを返す。
 * 一方の失敗が他方の投稿を妨げないよう、両プラットフォームを独立に処理する。
 *
 * ── 重複防止・タイムアウト耐性（重要）─────────────────────────────
 * Vercel の関数上限（60s）内に長いスレッドを投稿しきれない場合がある。素朴に
 * 「全部投稿してから DB 更新」すると、途中で関数が落ちたとき投稿は成立しているのに
 * 記録が残らず、再実行で同じ内容を二重投稿してしまう（実際に発生した障害）。
 *
 * 対策:
 *   1. チャンク単位の冪等: prior（payload.results の投稿済みチャンク）はスキップし、
 *      未投稿のチャンクだけを直前ポストへの reply として続きから投稿する。
 *      → 何度再処理されても投稿済みチャンクは二度と投稿されない。
 *   2. deadline での安全中断: 各チャンク投稿の前に締切（cron 起動からの予算）を確認し、
 *      超えていたら「投稿成立分だけ」を返して停止（stoppedEarly）。関数が強制終了する前に
 *      正常リターン → 呼び出し側が results を確実に保存できる。
 *   3. resume: 残りチャンクは次回 cron で続きから投稿（呼び出し側が status=scheduled に戻す）。
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
import { checkDailyCap } from '@/lib/post-safety';
import type { ScheduledChunk } from '@/lib/scheduled-post-payload';

// 1 チャンク投稿の最悪所要時間の見積り（deadline 手前で「次の1件が収まるか」を判断するための予約時間）。
// 画像付きは Meta 側のコンテナ処理待ち（最大30s）＋ Media Not Found リトライで長くなる。
// 関数強制終了（60s）を跨がないよう、開始前にこの予約分の余裕が無ければ停止して resume する。
const TEXT_CHUNK_RESERVE_MS  = 25_000;
const IMAGE_CHUNK_RESERVE_MS = 45_000;
const chunkReserveMs = (chunk: ScheduledChunk): number =>
  chunk.images.length > 0 ? IMAGE_CHUNK_RESERVE_MS : TEXT_CHUNK_RESERVE_MS;

/** プラットフォーム別ランナーの戻り値 */
interface PlatformRunResult {
  /** 投稿済み（prior + 今回分）の全アイテム。chunk 順。*/
  items: ScheduledPostResultItem[];
  /** ハードエラー（API 失敗等。再開しても直る保証がないもの）*/
  error?: string;
  /** deadline 到達で未投稿チャンクを残して停止したか（resume 対象）*/
  stoppedEarly: boolean;
  /** X 投稿に使ったアカウント UUID（X のみ）*/
  accountId?: string | null;
}

/** chunk 順に投稿する X 側の処理（prior をスキップして続きから）*/
async function runX(
  userId: string,
  payload: ScheduledPostPayload,
  prior: ScheduledPostResultItem[],
  deadline: number,
): Promise<PlatformRunResult> {
  const client = await getActiveXClient(userId);
  if (!client) {
    return { items: prior, error: 'X API の認証情報が見つかりません', stoppedEarly: false, accountId: null };
  }
  const accountId = await getActiveXAccountId(userId);

  const items: ScheduledPostResultItem[] = [...prior];
  const remaining = payload.chunks.length - items.length;
  if (remaining <= 0) return { items, stoppedEarly: false, accountId };

  // 構造的セーフティ: 24h 投稿上限を超えるなら投稿しない（残り件数で判定）
  const cap = await checkDailyCap(userId, 'x', remaining);
  if (!cap.ok) return { items, error: cap.error, stoppedEarly: false, accountId };

  let lastId: string | undefined = items.length ? items[items.length - 1].postId : undefined;

  for (let i = items.length; i < payload.chunks.length; i++) {
    const chunk = payload.chunks[i];
    // この1件が締切までに安全に収まらなければ停止して resume（強制終了で途中に落ちるのを防ぐ）
    if (Date.now() + chunkReserveMs(chunk) > deadline) return { items, stoppedEarly: true, accountId };

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
        return { items, error: `chunk ${i + 1} の画像アップロードに失敗: ${msg}`, stoppedEarly: false, accountId };
      }
    }

    const params: Record<string, unknown> = {};
    if (payload.mode === 'thread' && lastId) params.reply = { in_reply_to_tweet_id: lastId };
    if (mediaIds.length > 0)                 params.media = { media_ids: mediaIds };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await client.v2.tweet(chunk.text, params as any);
      const tweetId = data.id;
      items.push({ postId: tweetId, url: `https://x.com/i/web/status/${tweetId}` });
      lastId = tweetId;
    } catch (err: unknown) {
      const apiErr = err as { data?: { detail?: string; errors?: { message?: string }[] }; message?: string };
      const detail =
        apiErr.data?.detail ??
        apiErr.data?.errors?.[0]?.message ??
        (err instanceof Error ? err.message : 'unknown error');
      return { items, error: `chunk ${i + 1}: ${detail}`, stoppedEarly: false, accountId };
    }
  }

  return { items, stoppedEarly: false, accountId };
}

/** chunk 順に投稿する Threads 側の処理（prior をスキップして続きから）*/
async function runThreads(
  userId: string,
  payload: ScheduledPostPayload,
  prior: ScheduledPostResultItem[],
  deadline: number,
): Promise<PlatformRunResult> {
  const accessToken = await getActiveThreadsAccessToken(userId);
  if (!accessToken) return { items: prior, error: 'Threads API の認証情報が見つかりません', stoppedEarly: false };

  const items: ScheduledPostResultItem[] = [...prior];
  const remaining = payload.chunks.length - items.length;
  if (remaining <= 0) return { items, stoppedEarly: false };

  // 構造的セーフティ: 24h 投稿上限を超えるなら投稿しない（残り件数で判定）
  const cap = await checkDailyCap(userId, 'threads', remaining);
  if (!cap.ok) return { items, error: cap.error, stoppedEarly: false };

  let lastId: string | undefined = items.length ? items[items.length - 1].postId : undefined;

  for (let i = items.length; i < payload.chunks.length; i++) {
    const chunk = payload.chunks[i];
    // この1件が締切までに安全に収まらなければ停止して resume（強制終了で途中に落ちるのを防ぐ）
    if (Date.now() + chunkReserveMs(chunk) > deadline) return { items, stoppedEarly: true };

    const imageUrls = chunk.images.map((img) => img.publicUrl);
    try {
      const result = await postThreadsSingle({
        accessToken,
        text: chunk.text,
        replyToId: payload.mode === 'thread' ? lastId : undefined,
        imageUrls,
      });
      items.push({ postId: result.id, url: result.permalink ?? 'https://www.threads.net/' });
      lastId = result.id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      return { items, error: `chunk ${i + 1}: ${msg}`, stoppedEarly: false };
    }
  }
  return { items, stoppedEarly: false };
}

/**
 * Instagram 側の処理（単一投稿）。
 * Instagram はリプライ連結が無いため、全 chunk のテキストを連結して1キャプションにし、
 * 全 chunk の画像を最大10枚まで集約して1投稿（カルーセル）として公開する。
 * 画像が1枚も無い場合は投稿不可（Instagram は画像必須）。
 * 既に投稿済み（prior に1件）なら何もしない（冪等）。
 */
async function runInstagram(
  userId: string,
  payload: ScheduledPostPayload,
  prior: ScheduledPostResultItem[],
  deadline: number,
): Promise<PlatformRunResult> {
  if (prior.length >= 1) {
    const accountId = await getActiveInstagramAccountId(userId);
    return { items: prior, stoppedEarly: false, accountId };
  }

  const accessToken = await getActiveInstagramAccessToken(userId);
  if (!accessToken) {
    return { items: prior, error: 'Instagram API の認証情報が見つかりません', stoppedEarly: false, accountId: null };
  }
  const accountId = await getActiveInstagramAccountId(userId);

  // 構造的セーフティ: 24h 投稿上限を超えるなら投稿しない（Instagram は単一投稿=1件）
  const cap = await checkDailyCap(userId, 'instagram', 1);
  if (!cap.ok) return { items: prior, error: cap.error, stoppedEarly: false, accountId };

  // Instagram は画像必須＝画像処理待ちが入るため画像向け予約時間で判定
  if (Date.now() + IMAGE_CHUNK_RESERVE_MS > deadline) return { items: prior, stoppedEarly: true, accountId };

  const caption = payload.chunks.map((c) => c.text).join('\n\n').trim();
  const imageUrls = payload.chunks
    .flatMap((c) => c.images.map((img) => img.publicUrl))
    .slice(0, 10);

  if (imageUrls.length === 0) {
    return { items: prior, error: 'Instagram は画像が1枚以上必要です', stoppedEarly: false, accountId };
  }

  try {
    const result = await postInstagramSingle({ accessToken, caption, imageUrls });
    const url = result.permalink ?? 'https://www.instagram.com/';
    return { items: [{ postId: result.id, url }], stoppedEarly: false, accountId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return { items: prior, error: msg, stoppedEarly: false, accountId };
  }
}

/**
 * 予約投稿を実行する。プラットフォームごとに独立して処理し、
 * 一方が失敗してももう一方には反映する。
 *
 * deadline（ms timestamp）までに全チャンクを投稿しきれない場合は、投稿成立分のみ
 * results に詰めて needsResume=true を返す。呼び出し側はそれを status=scheduled に戻し、
 * 次回 cron で続きから（prior をスキップして）投稿する。
 *
 * 戻り値:
 *   - results: プラットフォーム別の結果（DB の payload.results にそのまま保存）
 *   - status:  'published'（全完了）/ 'failed'（どこも成立せず）/ 'partial'（一部成立）
 *   - xAccountId: X 投稿に使ったアカウント UUID（DB の x_account_id 列更新用）
 *   - needsResume: deadline 到達で未投稿チャンクを残した（=次回続きを投稿すべき）
 */
export async function runScheduledPost(params: {
  userId: string;
  payload: ScheduledPostPayload;
  /** これ以降は新規チャンクを投稿しない締切（ms timestamp）。未指定なら無制限。*/
  deadline?: number;
}): Promise<{
  results: ScheduledPostResults;
  status: 'published' | 'failed' | 'partial';
  xAccountId: string | null;
  needsResume: boolean;
}> {
  const { userId, payload } = params;
  const deadline = params.deadline ?? Number.POSITIVE_INFINITY;

  const wantsX         = payload.platforms.includes('x');
  const wantsThreads   = payload.platforms.includes('threads');
  const wantsInstagram = payload.platforms.includes('instagram');

  const prior = payload.results;
  const priorX  = prior?.x         ?? [];
  const priorT  = prior?.threads   ?? [];
  const priorIG = prior?.instagram ?? [];

  const [x, t, ig] = await Promise.all([
    wantsX         ? runX(userId, payload, priorX, deadline)         : Promise.resolve(null),
    wantsThreads   ? runThreads(userId, payload, priorT, deadline)   : Promise.resolve(null),
    wantsInstagram ? runInstagram(userId, payload, priorIG, deadline): Promise.resolve(null),
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

  // 完了判定:
  //   - 期待した全プラットフォームで全チャンク投稿済み → published
  //   - deadline で未投稿を残した（ハードエラー無し）→ needsResume（次回続き）
  //   - どこも1件も成立せず → failed
  //   - それ以外（一部成立 + エラー等で再開しない）→ partial
  const total = payload.chunks.length;
  const xDone  = !wantsX         || ((x?.items.length  ?? 0) >= total && !x?.error);
  const tDone  = !wantsThreads   || ((t?.items.length  ?? 0) >= total && !t?.error);
  const igDone = !wantsInstagram || ((ig?.items.length ?? 0) >= 1     && !ig?.error);
  const fullSuccess = xDone && tDone && igDone;
  const anyError       = !!(x?.error || t?.error || ig?.error);
  const anyStoppedEarly = !!(x?.stoppedEarly || t?.stoppedEarly || ig?.stoppedEarly);
  const anySuccess     = (x?.items.length ?? 0) > 0 || (t?.items.length ?? 0) > 0 || (ig?.items.length ?? 0) > 0;

  // resume するのは「ハードエラー無しで deadline により未投稿を残した」場合のみ。
  // エラーがある場合は再開で直る保証が無いため resume せず確定させる。
  const needsResume = anyStoppedEarly && !anyError && !fullSuccess;

  let status: 'published' | 'failed' | 'partial';
  if (fullSuccess)      status = 'published';
  else if (needsResume) status = 'partial';
  else if (!anySuccess) status = 'failed';
  else                  status = 'partial';

  return { results, status, xAccountId: x?.accountId ?? null, needsResume };
}
