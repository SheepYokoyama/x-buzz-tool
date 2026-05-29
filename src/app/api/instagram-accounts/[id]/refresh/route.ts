import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { verifyInstagramTokens } from '@/lib/instagram-client';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/instagram-accounts/[id]/refresh
 * 保存済みトークンで Instagram API を叩き、username / display name / profile_image_url を最新化する。
 */
export async function POST(req: Request, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('social_accounts')
    .select('access_token, name')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('platform', 'instagram')
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'アカウントが見つかりません' }, { status: 404 });
  }

  let token: string;
  try {
    token = decrypt(existing.access_token);
  } catch {
    return NextResponse.json(
      { error: '保存済みトークンの復号に失敗しました。再登録してください。' },
      { status: 500 },
    );
  }

  const verified = await verifyInstagramTokens({ access_token: token });
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error, errorCode: verified.errorCode },
      { status: verified.errorCode === 'invalid_token' ? 401 : 400 },
    );
  }

  const newName     = verified.user?.name ?? existing.name;
  const newUsername = verified.user?.username ?? null;
  const newImageUrl = verified.user?.profileImageUrl ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('social_accounts')
    .update({
      name:              newName,
      username:          newUsername,
      profile_image_url: newImageUrl,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('platform', 'instagram')
    .select('id, platform, name, username, profile_image_url, is_active, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    account: data,
    verifiedUser: verified.user,
  });
}
