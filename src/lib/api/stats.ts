import { getSupabaseServer } from '@/lib/supabase';
import { getXClient, isXConfigured } from '@/lib/x-client';
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
    // 投稿ごとに最新の1件だけ使う
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

/**
 * 先月比の変化率（%、小数点1桁）を返す。
 * 先月が 0 の場合は null。
 */
function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * 指定期間内の公開済み投稿＋メトリクスを取得する。
 */
async function fetchPublishedWithMetrics(
  supabase: ReturnType<typeof getSupabaseServer>,
  startIso: string,
  endIso?: string,
): Promise<PostWithMetrics[]> {
  let query = supabase
    .from('scheduled_posts')
    .select(
      'id, post_metrics(likes, impressions, engagement_rate, measured_at)',
    )
    .eq('status', 'published')
    .gte('published_at', startIso);

  if (endIso) query = query.lt('published_at', endIso);

  const { data } = await query;
  return (data ?? []) as PostWithMetrics[];
}

// ── 公開 API ─────────────────────────────────────────────────────────────────

/** ダッシュボード用の集計統計を取得する（今月分のみ・先月比付き） */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseServer();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [
    publishedThisMonth,
    publishedLastMonth,
    scheduledResult,
    postsThisMonth,
    postsLastMonth,
  ] = await Promise.all([
    // 今月の公開済み投稿数
    supabase
      .from('scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', thisMonthStart),

    // 先月の公開済み投稿数
    supabase
      .from('scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', lastMonthStart)
      .lt('published_at', thisMonthStart),

    // 予約中投稿数
    supabase
      .from('scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled'),

    // 今月の投稿＋メトリクス
    fetchPublishedWithMetrics(supabase, thisMonthStart),

    // 先月の投稿＋メトリクス
    fetchPublishedWithMetrics(supabase, lastMonthStart, thisMonthStart),
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

/**
 * X API からフォロワー数を取得する。
 * X 未接続またはエラー時は null を返す。
 */
export async function getFollowersCount(): Promise<number | null> {
  if (!isXConfigured()) return null;
  try {
    const client = getXClient()!;
    const { data } = await client.v2.me({ 'user.fields': ['public_metrics'] });
    const metrics = data.public_metrics as { followers_count?: number } | undefined;
    return metrics?.followers_count ?? null;
  } catch {
    return null;
  }
}
