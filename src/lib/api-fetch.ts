import { getSupabaseBrowser } from './supabase';

/**
 * 認証トークン付きの fetch ラッパー。
 * クライアントコンポーネントから API Route を呼ぶ時に使用。
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const supabase = getSupabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  // FormData の場合は Content-Type を設定しない（ブラウザが boundary 付きで自動設定する）
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  return fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
