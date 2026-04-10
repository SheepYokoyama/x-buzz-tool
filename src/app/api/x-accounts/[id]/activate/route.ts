import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/x-accounts/[id]/activate — アクティブアカウントを切り替え */
export async function PATCH(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const now = new Date().toISOString();

  // 全アカウントを非アクティブ化してから、対象だけアクティブ化
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: err1 } = await (supabase as any)
    .from('x_accounts')
    .update({ is_active: false, updated_at: now })
    .not('id', 'is', null); // 全件対象（id は NOT NULL なので常に全行マッチ）

  if (err1) return NextResponse.json({ error: err1.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: err2 } = await (supabase as any)
    .from('x_accounts')
    .update({ is_active: true, updated_at: now })
    .eq('id', id);

  if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
