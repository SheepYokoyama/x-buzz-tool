import { getSupabaseAdmin } from './supabase';
import { getActiveXClient } from './x-client';

export type SyncResult =
  | { id: string; tweetId: string; status: 'synced'; likes: number; impressions: number }
  | { id: string; tweetId: string; status: 'skipped'; reason: string }
  | { id: string; tweetId: string; status: 'failed'; error: string };

export interface SyncSummary {
  total:   number;
  synced:  number;
  failed:  number;
  skipped: number;
  results: SyncResult[];
}

/**
 * 公開済み投稿の X メトリクスを同期して post_metrics に upsert する。
 * userId が指定された場合はそのユーザーの投稿のみ、null の場合は全ユーザーの投稿を対象。
 */
export async function syncPublishedMetrics(userId: string | null): Promise<SyncSummary> {
  const supabase = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('scheduled_posts')
    .select('id, x_post_id, user_id')
    .eq('status', 'published')
    .not('x_post_id', 'is', null);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const posts = (data ?? []) as { id: string; x_post_id: string; user_id: string | null }[];
  if (posts.length === 0) {
    return { total: 0, synced: 0, failed: 0, skipped: 0, results: [] };
  }

  const xClientCache = new Map<string, Awaited<ReturnType<typeof getActiveXClient>>>();
  const results: SyncResult[] = [];

  for (const post of posts) {
    const tweetId = post.x_post_id;

    if (!post.user_id) {
      results.push({ id: post.id, tweetId, status: 'skipped', reason: 'post has no user_id' });
      continue;
    }

    if (!xClientCache.has(post.user_id)) {
      xClientCache.set(post.user_id, await getActiveXClient(post.user_id));
    }
    const xClient = xClientCache.get(post.user_id) ?? null;

    if (!xClient) {
      results.push({ id: post.id, tweetId, status: 'skipped', reason: 'X API not configured for user' });
      continue;
    }

    try {
      const tweet = await xClient.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics', 'created_at'],
      });

      if (!tweet.data?.public_metrics) {
        results.push({ id: post.id, tweetId, status: 'skipped', reason: 'メトリクスなし' });
        continue;
      }

      const pub = tweet.data.public_metrics;
      const likes       = pub.like_count        ?? 0;
      const retweets    = pub.retweet_count     ?? 0;
      const replies     = pub.reply_count       ?? 0;
      const impressions = pub.impression_count  ?? 0;
      const bookmarks   = pub.bookmark_count    ?? 0;
      const engagementRate =
        impressions > 0 ? ((likes + retweets + replies) / impressions) * 100 : 0;

      const { error: upsertError } = await supabase.from('post_metrics').upsert({
        scheduled_post_id: post.id,
        measured_at:       new Date().toISOString(),
        likes,
        retweets,
        replies,
        impressions,
        bookmarks,
        engagement_rate: Math.round(engagementRate * 100) / 100,
      });

      if (upsertError) {
        results.push({ id: post.id, tweetId, status: 'failed', error: upsertError.message });
      } else {
        results.push({ id: post.id, tweetId, status: 'synced', likes, impressions });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown error';
      console.error(`[metrics-sync] tweetId=${tweetId}:`, message);
      results.push({ id: post.id, tweetId, status: 'failed', error: message });
    }
  }

  const synced  = results.filter((r) => r.status === 'synced').length;
  const failed  = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  return { total: posts.length, synced, failed, skipped, results };
}

/**
 * 指定ユーザーの post_metrics の最新 measured_at を取得する。なければ null。
 */
export async function getLastSyncedAt(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('post_metrics')
    .select('measured_at, scheduled_posts!inner(user_id)')
    .eq('scheduled_posts.user_id', userId)
    .order('measured_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return (data[0] as { measured_at: string }).measured_at;
}
