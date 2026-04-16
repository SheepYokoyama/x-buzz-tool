import type { FollowHuntSettings } from './types';

/** twitter-api-v2 の user.public_metrics 部分 */
interface XPublicMetrics {
  followers_count: number;
  following_count: number;
  tweet_count?: number;
  listed_count?: number;
}

/** twitter-api-v2 の user v2 オブジェクト */
export interface XUserV2 {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
  public_metrics?: XPublicMetrics;
  created_at?: string;
}

/** search_recent のツイート v2 オブジェクト */
export interface XTweetV2 {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
}

/** ペルソナのキーワードから X Search 用クエリを組み立てる */
export function buildSearchQuery(keywords: string[]): string {
  const cleaned = keywords
    .map((k) => k.trim())
    .filter((k) => k.length >= 2 && k.length <= 40)
    .slice(0, 10);
  if (cleaned.length === 0) return '';
  const or = cleaned.map((k) => (k.includes(' ') ? `"${k}"` : k)).join(' OR ');
  return `(${or}) lang:ja -is:retweet -is:reply`;
}

/** followers / following から FF 比を計算（0 除算は Infinity） */
export function calcFfRatio(followers: number, following: number): number {
  if (following <= 0) return Number.POSITIVE_INFINITY;
  return Math.round((followers / following) * 100) / 100;
}

/** bio に禁止ワードが含まれるかチェック */
export function hasBannedWord(bio: string, bannedWords: string[]): boolean {
  if (!bio) return false;
  const lower = bio.toLowerCase();
  return bannedWords.some((w) => w.trim() && lower.includes(w.toLowerCase()));
}

/** bio / sample tweet から一致したキーワードを抽出 */
export function extractMatchedKeywords(
  keywords: string[],
  bio: string,
  sampleTweet: string
): string[] {
  const haystack = `${bio}\n${sampleTweet}`.toLowerCase();
  return keywords.filter((k) => k.trim() && haystack.includes(k.toLowerCase()));
}

/** プロフィールがフィルタ条件を満たすかチェック（最初にヒットした却下理由を返す） */
export function filterCandidate(
  user: XUserV2,
  settings: FollowHuntSettings
): { ok: true } | { ok: false; reason: string } {
  const metrics = user.public_metrics;
  if (!metrics) return { ok: false, reason: 'public_metrics なし' };

  const { followers_count, following_count } = metrics;

  if (followers_count < settings.min_followers)
    return { ok: false, reason: `followers 少 (${followers_count})` };
  if (followers_count > settings.max_followers)
    return { ok: false, reason: `followers 多 (${followers_count})` };

  const ff = calcFfRatio(followers_count, following_count);
  if (!Number.isFinite(ff)) return { ok: false, reason: 'following=0' };
  if (ff < settings.min_ff_ratio)
    return { ok: false, reason: `FF比 低 (${ff})` };
  if (ff > settings.max_ff_ratio)
    return { ok: false, reason: `FF比 高 (${ff})` };

  if (hasBannedWord(user.description ?? '', settings.banned_words))
    return { ok: false, reason: '禁止ワード' };

  return { ok: true };
}

/** pay-per-use コスト見積もり（$） */
export function estimateCost(maxResults: number): number {
  // tweets read: $0.005 × max_results
  // profiles:    $0.01  × max_results（最悪ケース）
  return Math.round((0.005 * maxResults + 0.01 * maxResults) * 100) / 100;
}
