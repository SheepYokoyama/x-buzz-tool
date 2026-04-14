import { getSupabaseServer } from '@/lib/supabase';
import { getActiveXClient, getActiveXAccountId } from '@/lib/x-client';
import type { DashboardStats } from '@/lib/types';

// ── 型 ──────────────────────────────────────────────────────────────────────

type MetricsRow = {
  likes: number;
  impressions: number;
  engagement_rate: number | null;
  measured_at: string;
};

type PostWithMetrics = {
  id: string;
  post_metrics: MetricsRow[];
};

// ── ヘルパー ─────────────────────────────────────────────────────────────────

/** 投稿一覧から「各投稿の最新メトリクス」を集計して合計を返す */
function aggregateRows(posts: PostWithMetrics[]) {
  let totalLikes = 0;
  let totalImpressions = 0;
  let engRateSum = 0;
  let engRateCount = 0;

  for (const post of posts) {
    if (!post.post_metrics?.length) continue;
    const latest = [...post.post_metrics].sort(
      (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
    )[0];
    totalLikes += latest.likes;
    totalImpressions += latest.impressions;
    if (latest.engagement_rate != null) {
      engRateSum += latest.engagement_rate;
      engRateCount++;
    }
  }

  return {
    totalLikes,
    totalImpressions,
    avgEngagementRate:
      engRateCount > 0 ? Math.round((engRateSum / engRateCount) * 10) / 10 : 0,
  };
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPublishedWithMetrics(
  supabase: any,
  startIso: string,
  endIso?: string,
  accountId?: string | null,
): Promise<PostWithMetrics[]> {
  let query = supabase
    .from('scheduled_posts')
    .select(
      'id, post_metrics(likes, impressions, engagement_rate, measured_at)',
    )
    .eq('status', 'published')
    .gte('published_at', startIso);

  if (endIso) query = query.lt('published_at', endIso);
  if (accountId) query = query.eq('x_account_id', accountId);

  const { data } = await query;
  return (data ?? []) as PostWithMetrics[];
}

// ── 公開 API ─────────────────────────────────────────────────────────────────

/** ダッシュボード用の集計統計を取得する */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await getSupabaseServer();
  const activeAccountId = await getActiveXAccountId();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  function countQuery(startIso: string, endIso?: string) {
    let q = supabase
      .from('scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', startIso);
    if (endIso) q = q.lt('published_at', endIso);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (activeAccountId) q = (q as any).eq('x_account_id', activeAccountId);
    return q;
  }

  const [
    publishedThisMonth,
    publishedLastMonth,
    scheduledResult,
    postsThisMonth,
    postsLastMonth,
  ] = await Promise.all([
    countQuery(thisMonthStart),
    countQuery(lastMonthStart, thisMonthStart),
    (() => {
      let q = supabase
        .from('scheduled_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (activeAccountId) q = (q as any).eq('x_account_id', activeAccountId);
      return q;
    })(),
    fetchPublishedWithMetrics(supabase, thisMonthStart, undefined, activeAccountId),
    fetchPublishedWithMetrics(supabase, lastMonthStart, thisMonthStart, activeAccountId),
  ]);

  const thisMonth = aggregateRows(postsThisMonth);
  const lastMonth = aggregateRows(postsLastMonth);

  const totalPostsThis = publishedThisMonth.count ?? 0;
  const totalPostsLast = publishedLastMonth.count ?? 0;

  return {
    totalPosts: totalPostsThis,
    totalLikes: thisMonth.totalLikes,
    totalImpressions: thisMonth.totalImpressions,
    avgEngagementRate: thisMonth.avgEngagementRate,
    scheduledCount: scheduledResult.count ?? 0,
    followersGrowth: 0,
    changes: {
      totalPosts: calcChange(totalPostsThis, totalPostsLast),
      totalLikes: calcChange(thisMonth.totalLikes, lastMonth.totalLikes),
      totalImpressions: calcChange(thisMonth.totalImpressions, lastMonth.totalImpressions),
      avgEngagementRate: calcChange(thisMonth.avgEngagementRate, lastMonth.avgEngagementRate),
    },
  };
}

export async function getFollowersCount(): Promise<number | null> {
  try {
    const client = await getActiveXClient();
    if (!client) return null;
    const { data } = await client.v2.me({ 'user.fields': ['public_metrics'] });
    const metrics = data.public_metrics as { followers_count?: number } | undefined;
    return metrics?.followers_count ?? null;
  } catch {
    return null;
  }
}
