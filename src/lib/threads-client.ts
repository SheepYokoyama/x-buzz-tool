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
// 以下は Phase 3 で実装する投稿関連のスタブ
// ─────────────────────────────────────────────────────────────

export interface ThreadsPostResult {
  id: string;
  permalink: string | null;
}

/**
 * 単一テキスト/画像 Threads 投稿を行う（Phase 3 で実装）。
 *
 * Meta Threads 投稿は 2 段階:
 *   1. POST /me/threads             — メディアコンテナ作成（media_type: TEXT/IMAGE/...）
 *   2. POST /me/threads_publish     — コンテナを公開
 */
export async function postThreadsSingle(_params: {
  accessToken: string;
  text: string;
  imageUrl?: string;
  replyToId?: string;
}): Promise<ThreadsPostResult> {
  throw new Error('postThreadsSingle is not yet implemented (Phase 3)');
}
