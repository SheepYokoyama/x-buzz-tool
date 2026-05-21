/**
 * Threads (Meta Graph API) クライアント
 *
 * X (twitter-api-v2) と異なり Threads は OAuth 2.0 のアクセストークン1本で動く。
 * Meta Developer Portal で取得した Long-lived access token を social_accounts.access_token に
 * 暗号化保存して利用する想定。
 *
 * 参考: https://developers.facebook.com/docs/threads
 */
import { getSupabaseAdmin } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';
const VERIFY_TIMEOUT_MS = 10_000;

export interface VerifiedThreadsUser {
  id: string;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
}

export type ThreadsVerifyErrorCode =
  | 'invalid_token'
  | 'forbidden'
  | 'rate_limit'
  | 'network'
  | 'unknown';

export interface ThreadsVerifyResult {
  ok: boolean;
  user?: VerifiedThreadsUser;
  errorCode?: ThreadsVerifyErrorCode;
  error?: string;
}

/**
 * 与えられた Threads アクセストークンが有効かを Meta Graph API の /me で検証する。
 * 登録・更新時の認証確立確認に使用。
 */
export async function verifyThreadsTokens(tokens: {
  access_token: string;
}): Promise<ThreadsVerifyResult> {
  try {
    const url = new URL(`${THREADS_API_BASE}/me`);
    url.searchParams.set(
      'fields',
      'id,username,name,threads_profile_picture_url',
    );
    url.searchParams.set('access_token', tokens.access_token);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 400) {
      return {
        ok: false,
        errorCode: 'invalid_token',
        error: 'トークンが無効です。Meta Developer Portal で Threads アクセストークンを再発行してから登録してください。',
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        errorCode: 'forbidden',
        error: 'Threads API の権限が不足しています。アプリの Threads 関連スコープ（threads_basic, threads_content_publish）の許可をご確認ください。',
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        errorCode: 'rate_limit',
        error: 'Threads API のレート制限に達しました。しばらく待ってから再試行してください。',
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        errorCode: 'unknown',
        error: `認証確認に失敗しました: HTTP ${res.status} ${text}`,
      };
    }

    const data = (await res.json()) as {
      id: string;
      username?: string;
      name?: string;
      threads_profile_picture_url?: string;
    };

    return {
      ok: true,
      user: {
        id: data.id,
        username: data.username ?? '',
        name: data.name ?? null,
        profileImageUrl: data.threads_profile_picture_url ?? null,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('aborted') || message.includes('timeout')) {
      return {
        ok: false,
        errorCode: 'network',
        error: 'Threads API への接続がタイムアウトしました。時間をおいて再試行してください。',
      };
    }
    return {
      ok: false,
      errorCode: 'unknown',
      error: `認証確認に失敗しました: ${message}`,
    };
  }
}

/**
 * 指定ユーザーのアクティブな Threads アカウントの復号済みアクセストークンを返す。
 * 投稿 API から利用する想定。未設定の場合は null。
 */
export async function getActiveThreadsAccessToken(userId: string): Promise<string | null> {
  if (!userId) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (getSupabaseAdmin() as any)
    .from('social_accounts')
    .select('access_token')
    .eq('is_active', true)
    .eq('platform', 'threads')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.access_token) return null;
  try {
    return decrypt(data.access_token);
  } catch {
    return null;
  }
}

/** 指定ユーザーのアクティブな Threads アカウントの UUID を返す。未設定の場合は null。 */
export async function getActiveThreadsAccountId(userId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (getSupabaseAdmin() as any)
    .from('social_accounts')
    .select('id')
    .eq('is_active', true)
    .eq('platform', 'threads')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** 指定ユーザーに認証済み Threads アカウントが存在するか確認 */
export async function isThreadsConfiguredAsync(userId: string): Promise<boolean> {
  const token = await getActiveThreadsAccessToken(userId);
  return token !== null;
}

// ─────────────────────────────────────────────────────────────
// 投稿系
// ─────────────────────────────────────────────────────────────

export interface ThreadsPostResult {
  id: string;
  permalink: string | null;
}

/** カルーセル上限（Meta の仕様で 2〜20 件、X 側と合わせるため当面 4 件まで） */
const CAROUSEL_MAX = 10;
/** メディアコンテナの処理完了待ちポーリング設定 */
const CONTAINER_POLL_INTERVAL_MS = 1_500;
const CONTAINER_POLL_TIMEOUT_MS  = 30_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * メディアコンテナ（IMAGE / CAROUSEL）の status が FINISHED になるまでポーリング。
 * 画像をクローラが取りに行く処理が非同期のため、即 publish するとエラーになる。
 *
 * 戻り値:
 *   - 'FINISHED': 公開可能
 *   - 'ERROR'  : 失敗（error_message を例外メッセージに含める）
 *   - 'TIMEOUT': タイムアウト（呼び出し側でハンドリング）
 */
async function waitForContainerReady(
  containerId: string,
  accessToken: string,
): Promise<{ status: 'FINISHED' } | { status: 'ERROR'; message: string } | { status: 'TIMEOUT' }> {
  const deadline = Date.now() + CONTAINER_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const url = new URL(`${THREADS_API_BASE}/${containerId}`);
    url.searchParams.set('fields', 'status,error_message');
    url.searchParams.set('access_token', accessToken);
    try {
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = (await res.json()) as { status?: string; error_message?: string };
        if (data.status === 'FINISHED') return { status: 'FINISHED' };
        if (data.status === 'ERROR' || data.status === 'EXPIRED') {
          return { status: 'ERROR', message: data.error_message ?? `container status=${data.status}` };
        }
        // IN_PROGRESS / PUBLISHED 以外は継続待機
      }
    } catch {
      /* 一時的ネットワーク失敗は次の poll で吸収 */
    }
    await sleep(CONTAINER_POLL_INTERVAL_MS);
  }
  return { status: 'TIMEOUT' };
}

/** POST /me/threads でコンテナを作成し、id を返す共通処理 */
async function createThreadsContainer(
  accessToken: string,
  params: Record<string, string>,
): Promise<string> {
  const url = new URL(`${THREADS_API_BASE}/me/threads`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Threads コンテナ作成に失敗: HTTP ${res.status} ${body}`);
  }
  const data = (await res.json()) as { id: string };
  if (!data?.id) throw new Error('Threads コンテナ作成: id が返りませんでした');
  return data.id;
}

/**
 * 単一 Threads 投稿を行う。
 *
 * Meta Threads 投稿は 2 段階:
 *   1. POST /me/threads             — メディアコンテナ作成
 *      - 画像なし: media_type=TEXT
 *      - 画像 1 枚: media_type=IMAGE, image_url=...
 *      - 画像 2 枚以上: 子コンテナ × n (is_carousel_item=true) → 親コンテナ (media_type=CAROUSEL, children=...)
 *   2. POST /me/threads_publish     — コンテナを公開
 *
 * 画像付きの場合はクローラが画像を取得する非同期処理があるため、
 * コンテナの status が FINISHED になるまでポーリングしてから publish する。
 *
 * スレッド連結時は replyToId で前ポストの id を渡す。
 */
export async function postThreadsSingle(params: {
  accessToken: string;
  text: string;
  replyToId?: string;
  /** Meta Graph API に渡す公開 image URL（Supabase Storage 等にアップロード済みのもの）*/
  imageUrls?: string[];
}): Promise<ThreadsPostResult> {
  const { accessToken, text, replyToId } = params;
  const imageUrls = (params.imageUrls ?? []).filter(Boolean).slice(0, CAROUSEL_MAX);

  // ── 1) コンテナ作成 ──────────────────────────────
  let containerId: string;
  let needsPolling = false;

  if (imageUrls.length === 0) {
    containerId = await createThreadsContainer(accessToken, {
      media_type: 'TEXT',
      text,
      ...(replyToId ? { reply_to_id: replyToId } : {}),
    });
  } else if (imageUrls.length === 1) {
    containerId = await createThreadsContainer(accessToken, {
      media_type: 'IMAGE',
      image_url: imageUrls[0],
      text,
      ...(replyToId ? { reply_to_id: replyToId } : {}),
    });
    needsPolling = true;
  } else {
    // カルーセル: 子コンテナを並列で作成 → 親コンテナを生成
    const childIds = await Promise.all(
      imageUrls.map((url) =>
        createThreadsContainer(accessToken, {
          media_type: 'IMAGE',
          image_url: url,
          is_carousel_item: 'true',
        }),
      ),
    );
    // 子コンテナそれぞれの処理完了を待ってから親を作る（Meta 公式手順）
    for (const cid of childIds) {
      const r = await waitForContainerReady(cid, accessToken);
      if (r.status === 'ERROR')   throw new Error(`Threads 画像処理に失敗: ${r.message}`);
      if (r.status === 'TIMEOUT') throw new Error('Threads 画像処理がタイムアウトしました（30秒）');
    }
    containerId = await createThreadsContainer(accessToken, {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      text,
      ...(replyToId ? { reply_to_id: replyToId } : {}),
    });
    needsPolling = true;
  }

  // ── 2) 公開前にコンテナ完了を待つ（画像系のみ）──────────
  if (needsPolling) {
    const r = await waitForContainerReady(containerId, accessToken);
    if (r.status === 'ERROR')   throw new Error(`Threads コンテナ処理に失敗: ${r.message}`);
    if (r.status === 'TIMEOUT') throw new Error('Threads コンテナ処理がタイムアウトしました（30秒）');
  }

  // ── 3) 公開 ───────────────────────────────────
  const publishUrl = new URL(`${THREADS_API_BASE}/me/threads_publish`);
  publishUrl.searchParams.set('creation_id', containerId);
  publishUrl.searchParams.set('access_token', accessToken);

  const publishRes = await fetch(publishUrl.toString(), { method: 'POST' });
  if (!publishRes.ok) {
    const body = await publishRes.text().catch(() => '');
    throw new Error(`Threads 公開に失敗: HTTP ${publishRes.status} ${body}`);
  }
  const published = (await publishRes.json()) as { id: string };

  // ── 4) permalink 取得（失敗しても投稿自体は成立しているので無視）──
  let permalink: string | null = null;
  try {
    const detailUrl = new URL(`${THREADS_API_BASE}/${published.id}`);
    detailUrl.searchParams.set('fields', 'permalink');
    detailUrl.searchParams.set('access_token', accessToken);
    const detailRes = await fetch(detailUrl.toString());
    if (detailRes.ok) {
      const detail = (await detailRes.json()) as { permalink?: string };
      permalink = detail.permalink ?? null;
    }
  } catch {
    /* permalink 取得失敗は致命的ではない */
  }

  return { id: published.id, permalink };
}
