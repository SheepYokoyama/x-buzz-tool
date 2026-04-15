import { getSupabaseBrowser } from './supabase';

/**
 * 認証トークン付きの fetch ラッパー。
 * クライアントコンポーネントから API Route を呼ぶ時に使用。
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const supabase = getSupabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
