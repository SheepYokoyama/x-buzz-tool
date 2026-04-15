import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// =============================================
// ブラウザ用クライアント（Client Components で使用）
// @supabase/ssr の createBrowserClient を使用（シングルトン）。
// セッションを Cookie に自動同期するため、
// Server Components / Route Handlers の getSupabaseServer() でも同じセッションを共有できる。
// =============================================
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

// =============================================
// サーバー用クライアント（Server Components / Route Handlers で使用）
// Cookie を使ったセッション管理により認証状態を維持
// next/headers を動的にインポートして Client Component からの参照エラーを回避
// =============================================
export async function getSupabaseServer() {
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component からの呼び出し時は set できないが問題なし
          // Proxy（proxy.ts）側で Cookie が更新される
        }
      },
    },
  });
}

// =============================================
// 管理者用クライアント（RLS をバイパス・サーバー専用）
// x_accounts など認証不要なサーバー側操作に使用
// SUPABASE_SERVICE_ROLE_KEY は絶対にクライアントに渡さないこと
// =============================================
export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY が未設定です。RLS によって操作が失敗する場合があります。');
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
