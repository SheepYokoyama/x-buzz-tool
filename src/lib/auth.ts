import { getSupabaseServer } from './supabase';

/**
 * API Route Handler 用: 認証済みユーザーを取得する。
 * 未認証の場合は null を返す。
 */
export async function getAuthUser() {
  const supabase = await getSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}
