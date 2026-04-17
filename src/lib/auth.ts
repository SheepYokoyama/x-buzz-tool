import { getSupabaseAdmin, getSupabaseServer } from './supabase';

/**
 * Server Components / Server Actions 用: Cookie セッションから現在のユーザー ID を取得する。
 * 未認証の場合は null を返す。
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * API Route Handler 用: リクエストの Authorization ヘッダーから認証済みユーザーを取得する。
 * クライアントは `Authorization: Bearer <access_token>` を送る必要がある。
 * 未認証の場合は null を返す。5秒タイムアウト付き。
 */
export async function getAuthUser(req?: Request) {
  try {
    // Authorization ヘッダーからトークンを取得
    const authHeader = req?.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) return null;

    const supabase = getSupabaseAdmin();
    const result = await Promise.race([
      supabase.auth.getUser(token),
      new Promise<{ data: { user: null }; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null }, error: new Error('timeout') }), 5000)
      ),
    ]);
    const { data: { user }, error } = result;
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
