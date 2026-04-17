import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import type { PostPersona } from '@/lib/types';

/** 全ペルソナを取得（作成日順・ユーザー自身のみ） */
export async function getPersonas(): Promise<PostPersona[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('post_personas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getPersonas error:', error);
    return [];
  }
  return data ?? [];
}

/** アクティブなペルソナを1件取得（ユーザー自身のみ） */
export async function getActivePersona(): Promise<PostPersona | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('post_personas')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('getActivePersona error:', error);
    return null;
  }
  return data ?? null;
}
