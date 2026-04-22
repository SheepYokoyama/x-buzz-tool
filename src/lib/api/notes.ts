import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import type { Note } from '@/lib/types';

/** ログインユーザーのノートを取得（更新日時降順） */
export async function getNotes(): Promise<Note[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('getNotes error:', error);
    return [];
  }
  return (data ?? []) as Note[];
}
