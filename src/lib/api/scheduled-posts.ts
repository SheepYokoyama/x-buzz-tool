import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase';
import { getActiveXAccountId } from '@/lib/x-client';
import { getActiveThreadsAccountId } from '@/lib/threads-client';
import { getActiveInstagramAccountId } from '@/lib/instagram-client';
import type { ScheduledPost, ScheduledPostWithMetrics, PostMetrics } from '@/lib/types';

type RowWithMetrics = ScheduledPost & { post_metrics: PostMetrics[] };

function extractLatestMetrics(row: RowWithMetrics): ScheduledPostWithMetrics {
  const { post_metrics, ...post } = row;
  const latest = [...post_metrics].sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
  )[0] ?? null;
  return { ...post, latest_metrics: latest };
}

/** Cookieセッションから現在のユーザーIDを取得（未認証なら null） */
async function getCurrentUserId(): Promise<string | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * ダッシュボード絞り込み用：X / Threads / Instagram それぞれのアクティブアカウントIDを集約する。
 *
 * scheduled_posts.x_account_id には「代表アカウント」の UUID が入る（X優先→Threads→Instagram、
 * scheduled-posts/route.ts 参照）。X のアクティブIDだけで絞ると Threads/Instagram 単独投稿が
 * 除外されてしまうため、3プラットフォームのアクティブIDをまとめて返し `.in()` で絞り込む。
 */
async function getActiveAccountIds(userId: string): Promise<string[]> {
  const [xId, threadsId, instagramId] = await Promise.all([
    getActiveXAccountId(userId),
    getActiveThreadsAccountId(userId),
    getActiveInstagramAccountId(userId),
  ]);
  return [xId, threadsId, instagramId].filter((id): id is string => !!id);
}

/** 全ステータスの投稿一覧（ユーザー自身の投稿のみ・scheduled_at 昇順） */
export async function getScheduledPosts(): Promise<ScheduledPost[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledPost[];
}

/** 投稿履歴（ユーザー自身の全ステータス、最新メトリクス付き、scheduled_at 降順） */
export async function getPostHistory(): Promise<ScheduledPostWithMetrics[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*, post_metrics(*)')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as RowWithMetrics[]).map(extractLatestMetrics);
}

/** ダッシュボード用：最近の公開済み投稿（ユーザー自身・最新メトリクス付き・アクティブアカウント絞り込み） */
export async function getRecentPublishedPosts(limit = 4): Promise<ScheduledPostWithMetrics[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getSupabaseAdmin();
  const activeAccountIds = await getActiveAccountIds(userId);

  let query = supabase
    .from('scheduled_posts')
    .select('*, post_metrics(*)')
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  // X / Threads / Instagram のアクティブアカウントの投稿に絞る
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (activeAccountIds.length > 0) query = (query as any).in('x_account_id', activeAccountIds);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as RowWithMetrics[]).map(extractLatestMetrics);
}

/** ダッシュボード用：次の予約投稿（ユーザー自身・scheduled_at 昇順・アクティブアカウント絞り込み） */
export async function getUpcomingScheduledPosts(limit = 3): Promise<ScheduledPost[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getSupabaseAdmin();
  const activeAccountIds = await getActiveAccountIds(userId);

  let query = supabase
    .from('scheduled_posts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  // X / Threads / Instagram のアクティブアカウントの投稿に絞る
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (activeAccountIds.length > 0) query = (query as any).in('x_account_id', activeAccountIds);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledPost[];
}
