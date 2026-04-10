import { getSupabaseServer } from '@/lib/supabase';
import type { GeneratedPost } from '@/lib/types';

/** AI生成の下書き一覧（created_at 降順） */
export async function getDraftPosts(): Promise<GeneratedPost[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('generated_posts')
    .select('*')
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as GeneratedPost[];
}
