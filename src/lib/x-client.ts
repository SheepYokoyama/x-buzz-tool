import { TwitterApi } from 'twitter-api-v2';
import { getSupabaseAdmin } from '@/lib/supabase';
import { encrypt, decrypt } from '@/lib/encryption';

const VERIFY_TIMEOUT_MS = 10_000;

export interface VerifiedXUser {
  id: string;
  name: string;
  username: string;
  profileImageUrl: string | null;
}

export type VerifyErrorCode =
  | 'invalid_tokens'
  | 'forbidden'
  | 'rate_limit'
  | 'network'
  | 'unknown';

export interface VerifyResult {
  ok: boolean;
  user?: VerifiedXUser;
  errorCode?: VerifyErrorCode;
  error?: string;
}

/**
 * 与えられた OAuth 1.0a トークンが有効かを X API の v2.me で検証する。
 * 登録・更新時の認証確立確認に使用。失敗時はユーザー向け日本語メッセージで理由を返す。
 */
export async function verifyXTokens(tokens: {
  api_key: string;
  api_secret: string;
  access_token: string;
  access_secret: string;
}): Promise<VerifyResult> {
  try {
    const client = new TwitterApi({
      appKey:       tokens.api_key,
      appSecret:    tokens.api_secret,
      accessToken:  tokens.access_token,
      accessSecret: tokens.access_secret,
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), VERIFY_TIMEOUT_MS),
    );
    const { data } = await Promise.race([
      client.v2.me({ 'user.fields': ['username', 'name', 'profile_image_url'] }),
      timeout,
    ]);

    return {
      ok: true,
      user: {
        id: data.id,
        name: data.name,
        username: data.username,
        profileImageUrl: data.profile_image_url ?? null,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status  = (err as { code?: number })?.code;

    if (message === 'timeout') {
      return {
        ok: false,
        errorCode: 'network',
        error: 'X API への接続がタイムアウトしました。時間をおいて再試行してください。',
      };
    }
    if (status === 401) {
      return {
        ok: false,
        errorCode: 'invalid_tokens',
        error: 'トークンが無効です。X Developer Console で Access Token を再発行してから登録してください。',
      };
    }
    if (status === 403) {
      return {
        ok: false,
        errorCode: 'forbidden',
        error: 'アプリが Project に紐付いていない、または権限が不足しています。Pay-per-use 加入と User authentication settings（Read and Write）をご確認ください。',
      };
    }
    if (status === 429) {
      return {
        ok: false,
        errorCode: 'rate_limit',
        error: 'X API のレート制限に達しました。しばらく待ってから再試行してください。',
      };
    }
    return {
      ok: false,
      errorCode: 'unknown',
      error: `認証確認に失敗しました: ${message}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// DB のみ参照。env vars は初回自動シード時にのみ読む。
// ─────────────────────────────────────────────────────────────

/**
 * 環境変数に設定されたトークンが揃っているか確認（シード判定用）
 */
function envTokensAvailable(): boolean {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  return !!(X_API_KEY && X_API_SECRET && X_ACCESS_TOKEN && X_ACCESS_TOKEN_SECRET);
}

/**
 * 環境変数のトークンを暗号化して x_accounts に "しおづけ" として 1 度だけ挿入する。
 * すでにレコードが存在する場合は何もしない。
 */
export async function seedXAccountFromEnv(): Promise<void> {
  if (!envTokensAvailable()) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseAdmin() as any;

  // レコードが 1 件でもあればスキップ
  const { count } = await sb
    .from('x_accounts')
    .select('*', { count: 'exact', head: true });
  if ((count ?? 0) > 0) return;

  const {
    X_API_KEY,
    X_API_SECRET,
    X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET,
    X_BEARER_TOKEN,
    X_USERNAME,
  } = process.env;

  await sb.from('x_accounts').insert({
    name:          'しおづけ',
    username:      X_USERNAME ?? 'trade_cw',
    api_key:       encrypt(X_API_KEY!),
    api_secret:    encrypt(X_API_SECRET!),
    access_token:  encrypt(X_ACCESS_TOKEN!),
    access_secret: encrypt(X_ACCESS_TOKEN_SECRET!),
    bearer_token:  X_BEARER_TOKEN ? encrypt(X_BEARER_TOKEN) : null,
    is_active:     true,
  });
}

/**
 * 指定ユーザーのアクティブな X アカウントを DB から取得してクライアントを返す。
 * userId は必須（ユーザー分離のため）。未指定の場合は null を返す。
 * DB にレコードがない & env vars が設定されている場合は自動シード後に再取得する。
 * env vars への直接フォールバックは行わない（DB 管理に一本化）。
 */
export async function getActiveXClient(userId?: string): Promise<TwitterApi | null> {
  if (!userId) {
    console.warn('[x-client] getActiveXClient: userId 未指定のため null を返します');
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (getSupabaseAdmin() as any)
    .from('x_accounts')
    .select('api_key, api_secret, access_token, access_secret')
    .eq('is_active', true)
    .eq('user_id', userId);

  const { data } = await query.maybeSingle();

  if (data?.api_key && data?.api_secret && data?.access_token && data?.access_secret) {
    try {
      return new TwitterApi({
        appKey:       decrypt(data.api_key),
        appSecret:    decrypt(data.api_secret),
        accessToken:  decrypt(data.access_token),
        accessSecret: decrypt(data.access_secret),
      });
    } catch {
      return null;
    }
  }

  // DB が空で env vars がある → 一度だけシードして再試行
  if (envTokensAvailable()) {
    try {
      await seedXAccountFromEnv();
      return getActiveXClient(userId); // 再帰呼び出し（1 回のみ）
    } catch {
      return null;
    }
  }

  return null;
}

/** 指定ユーザーのアクティブな X アカウントの UUID を返す。未設定の場合は null。 */
export async function getActiveXAccountId(userId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (getSupabaseAdmin() as any)
    .from('x_accounts')
    .select('id')
    .eq('is_active', true)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** 指定ユーザーに認証済みアカウントが存在するか確認 */
export async function isXConfiguredAsync(userId: string): Promise<boolean> {
  const client = await getActiveXClient(userId);
  return client !== null;
}

/**
 * Bearer Token クライアント（読み取り専用）
 * ※ Bearer Token も将来 DB 管理予定。現在は env vars を参照。
 */
export function getXReadonlyClient(): TwitterApi | null {
  const { X_BEARER_TOKEN } = process.env;
  if (!X_BEARER_TOKEN) return null;
  return new TwitterApi(X_BEARER_TOKEN);
}

/**
 * @deprecated env vars を直接使う旧関数。新規コードでは getActiveXClient() を使うこと。
 */
export function getXClient(): TwitterApi | null {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) return null;
  return new TwitterApi({
    appKey:      X_API_KEY,
    appSecret:   X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  });
}

/** @deprecated getActiveXClient() を使うこと */
export function isXConfigured(): boolean {
  return envTokensAvailable();
}
