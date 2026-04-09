import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// =============================================
// ブラウザ用クライアント（Client Components で使用）
// シングルトンにしてインスタンスの重複生成を防ぐ
// =============================================
let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

// =============================================
// サーバー用クライアント（Server Components / Route Handlers で使用）
// リクエストをまたいで状態を共有しないよう毎回新規生成
// =============================================
export function getSupabaseServer() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Server Components では Cookie ベースの自動セッション管理は不要
      persistSession: false,
    },
  });
}
