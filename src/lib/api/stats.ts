import { getSupabaseServer } from '@/lib/supabase';
import { getXClient, isXConfigured } from '@/lib/x-client';
import type { DashboardStats } from '@/lib/types';

type MetricsRow = {
  scheduled_post_id: string;
  likes: number;
  impressions: number;
  engagement_rate: number | null;
  measured_at: string;
};

/** ダッシュボード用の集計統計を取得する */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseServer();

  const [publishedResult, scheduledResult, metricsResult] = await Promise.all([
    // 公開済み投稿の総数
    supabase
      .from('scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published'),

    // 予約中投稿の件数
    supabase
      .from('scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled'),

    // 全メトリクス（各投稿の最新値を集計）
    supabase
      .from('post_metrics')
      .select('scheduled_post_id, likes, impressions, engagement_rate, measured_at')
      .order('measured_at', { ascending: false }),
  ]);

  // メトリクスは投稿ごとに最新の1件だけ使う
  const rows = (metricsResult.data ?? []) as MetricsRow[];
  const seen = new Set<string>();
  let totalLikes = 0;
  let totalImpressions = 0;
  let engRateSum = 0;
  let engRateCount = 0;

  for (const m of rows) {
    if (seen.has(m.scheduled_post_id)) continue;
    seen.add(m.scheduled_post_id);
    totalLikes += m.likes;
    totalImpressions += m.impressions;
    if (m.engagement_rate != null) {
      engRateSum += m.engagement_rate;
      engRateCount++;
    }
  }

  return {
    totalPosts: publishedResult.count ?? 0,
    totalLikes,
    totalImpressions,
    avgEngagementRate: engRateCount > 0
      ? Math.round((engRateSum / engRateCount) * 10) / 10
      : 0,
    scheduledCount: scheduledResult.count ?? 0,
    followersGrowth: 0,
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
