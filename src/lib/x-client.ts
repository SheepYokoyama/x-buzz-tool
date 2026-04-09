import { TwitterApi } from 'twitter-api-v2';

/**
 * OAuth 1.0a クライアント（投稿・メトリクス取得）
 * 環境変数が未設定の場合は null を返す
 */
export function getXClient(): TwitterApi | null {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;

  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    return null;
  }

  return new TwitterApi({
    appKey:            X_API_KEY,
    appSecret:         X_API_SECRET,
    accessToken:       X_ACCESS_TOKEN,
    accessSecret:      X_ACCESS_TOKEN_SECRET,
  });
}

/**
 * Bearer Token クライアント（読み取り専用）
 */
export function getXReadonlyClient(): TwitterApi | null {
  const { X_BEARER_TOKEN } = process.env;
  if (!X_BEARER_TOKEN) return null;
  return new TwitterApi(X_BEARER_TOKEN);
}

/** 認証情報が揃っているか確認 */
export function isXConfigured(): boolean {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  return !!(X_API_KEY && X_API_SECRET && X_ACCESS_TOKEN && X_ACCESS_TOKEN_SECRET);
}
