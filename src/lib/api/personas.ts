import { getSupabaseAdmin } from '@/lib/supabase';
import type { PostPersona } from '@/lib/types';

/** 全ペルソナを取得（作成日順） */
export async function getPersonas(): Promise<PostPersona[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('post_personas')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getPersonas error:', error);
    return [];
  }
  return data ?? [];
}

/** アクティブなペルソナを1件取得 */
export async function getActivePersona(): Promise<PostPersona | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('post_personas')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('getActivePersona error:', error);
    return null;
  }
  return data ?? null;
}
