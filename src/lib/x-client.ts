import { TwitterApi } from 'twitter-api-v2';
import { getSupabaseAdmin } from '@/lib/supabase';
import { encrypt, decrypt } from '@/lib/encryption';

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
 * アクティブな X アカウントを DB から取得してクライアントを返す。
 * DB にレコードがない & env vars が設定されている場合は自動シード後に再取得する。
 * env vars への直接フォールバックは行わない（DB 管理に一本化）。
 */
export async function getActiveXClient(): Promise<TwitterApi | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (getSupabaseAdmin() as any)
    .from('x_accounts')
    .select('api_key, api_secret, access_token, access_secret')
    .eq('is_active', true)
    .single();

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
      return getActiveXClient(); // 再帰呼び出し（1 回のみ）
    } catch {
      return null;
    }
  }

  return null;
}

/** アクティブな X アカウントの UUID を返す。未設定の場合は null。 */
export async function getActiveXAccountId(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (getSupabaseAdmin() as any)
    .from('x_accounts')
    .select('id')
    .eq('is_active', true)
    .single();
  return data?.id ?? null;
}

/** DB に認証済みアカウントが存在するか確認 */
export async function isXConfiguredAsync(): Promise<boolean> {
  const client = await getActiveXClient();
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
