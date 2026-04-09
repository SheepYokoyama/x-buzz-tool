import { getSupabaseServer } from '@/lib/supabase';
import type { ScheduledPost, ScheduledPostWithMetrics, PostMetrics } from '@/lib/types';

type RowWithMetrics = ScheduledPost & { post_metrics: PostMetrics[] };

function extractLatestMetrics(row: RowWithMetrics): ScheduledPostWithMetrics {
  const { post_metrics, ...post } = row;
  const latest = [...post_metrics].sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
  )[0] ?? null;
  return { ...post, latest_metrics: latest };
}

/** 全ステータスの投稿一覧（scheduled_at 昇順） */
export async function getScheduledPosts(): Promise<ScheduledPost[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .order('scheduled_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledPost[];
}

/** 投稿履歴（全ステータス、最新メトリクス付き、scheduled_at 降順） */
export async function getPostHistory(): Promise<ScheduledPostWithMetrics[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*, post_metrics(*)')
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as RowWithMetrics[]).map(extractLatestMetrics);
}

/** ダッシュボード用：最近の公開済み投稿（最新メトリクス付き） */
export async function getRecentPublishedPosts(limit = 4): Promise<ScheduledPostWithMetrics[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*, post_metrics(*)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as RowWithMetrics[]).map(extractLatestMetrics);
}

/** ダッシュボード用：次の予約投稿（scheduled_at 昇順） */
export async function getUpcomingScheduledPosts(limit = 3): Promise<ScheduledPost[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledPost[];
}
