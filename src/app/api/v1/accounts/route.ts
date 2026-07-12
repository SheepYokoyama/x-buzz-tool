import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyThothApiKey, findUserIdByEmail } from '@/lib/thoth-partner';

/**
 * GET /api/v1/accounts?memberEmail=...
 * 会員の接続済み SNS アカウント一覧（仕様書 §2「補助API」）。
 * Thoth 側の「Expresso と接続」状態表示に使用する。
 * トークン類は一切返さない（プラットフォーム・アカウントID・表示名のみ）。
 */
export async function GET(req: Request) {
  const auth = verifyThothApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const memberEmail = new URL(req.url).searchParams.get('memberEmail')?.trim() ?? '';
  if (!memberEmail) {
    return NextResponse.json({ error: 'memberEmail クエリパラメータは必須です' }, { status: 422 });
  }

  let userId: string | null;
  try {
    userId = await findUserIdByEmail(memberEmail);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '会員照会に失敗しました';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (!userId) {
    return NextResponse.json(
      { error: `該当会員が Expresso に登録されていません: ${memberEmail}` },
      { status: 404 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin() as any)
    .from('social_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = (data ?? []).map((row: any) => ({
    accountId: row.id,
    platform: row.platform,
    name: row.name ?? null,
    username: row.username ?? null,
    isActive: !!row.is_active,
  }));

  return NextResponse.json({ memberEmail, accounts });
}
