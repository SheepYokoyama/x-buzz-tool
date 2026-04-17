import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import type { GeneratedPost } from '@/lib/types';

/** AI生成の下書き一覧（created_at 降順・ユーザー自身のみ） */
export async function getDraftPosts(): Promise<GeneratedPost[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('generated_posts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as GeneratedPost[];
}

/** JST（Asia/Tokyo）基準の「今日 00:00」の UTC ISO 文字列を返す */
function startOfTodayJstIso(): string {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // "YYYY-MM-DD"
  return new Date(`${ymd}T00:00:00+09:00`).toISOString();
}

/**
 * ダッシュボードのバナー用に、本日AI生成された下書きのサマリを返す。
 * - count: 本日生成された下書きの件数（status='draft' かつ created_at >= 今日0時JST）
 * - latestPersonaName: 最新1件に紐づくペルソナ名（なければ null）
 */
export async function getTodayDraftSummary(): Promise<{
  count: number;
  latestPersonaName: string | null;
}> {
  const userId = await getCurrentUserId();
  if (!userId) return { count: 0, latestPersonaName: null };

  const supabase = getSupabaseAdmin();
  const startIso = startOfTodayJstIso();

  const [{ count }, { data: latest }] = await Promise.all([
    supabase
      .from('generated_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'draft')
      .gte('created_at', startIso),
    supabase
      .from('generated_posts')
      .select('persona:post_personas(name)')
      .eq('user_id', userId)
      .eq('status', 'draft')
      .gte('created_at', startIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // persona は JOIN 結果の shape が object/array どちらにもなり得るため両対応
  const personaField = (latest as { persona?: { name?: string } | { name?: string }[] } | null)?.persona;
  const personaObj = Array.isArray(personaField) ? personaField[0] : personaField;
  const latestPersonaName = personaObj?.name ?? null;

  return { count: count ?? 0, latestPersonaName };
}
