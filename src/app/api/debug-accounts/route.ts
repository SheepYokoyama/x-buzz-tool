import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/debug-accounts
 * 一時的な診断用エンドポイント。確認後に削除すること。
 */
export async function GET() {
  const serviceKeySet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encKeySet     = !!process.env.ENCRYPTION_KEY;
  const supabaseUrl   = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(未設定)';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error, count } = await (getSupabaseAdmin() as any)
    .from('x_accounts')
    .select('id, name, username, is_active, created_at', { count: 'exact' });

  return NextResponse.json({
    env: {
      supabaseUrl,
      serviceKeySet,
      encKeySet,
    },
    db: {
      error: error?.message ?? null,
      count,
      accounts: (data ?? []).map((a: { id: string; name: string; username: string | null; is_active: boolean; created_at: string }) => ({
        id:        a.id,
        name:      a.name,
        username:  a.username,
        is_active: a.is_active,
        created_at: a.created_at,
      })),
    },
  });
}
