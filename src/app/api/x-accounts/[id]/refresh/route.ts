import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { verifyXTokens } from '@/lib/x-client';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/x-accounts/[id]/refresh
 * 保存済みトークンで X API を叩き、username / display name / profile_image_url を最新に上書きする。
 * トークン自体は変更しない。
 */
export async function POST(req: Request, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('x_accounts')
    .select('api_key, api_secret, access_token, access_secret, name')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'アカウントが見つかりません' }, { status: 404 });
  }

  let tokens: { api_key: string; api_secret: string; access_token: string; access_secret: string };
  try {
    tokens = {
      api_key:       decrypt(existing.api_key),
      api_secret:    decrypt(existing.api_secret),
      access_token:  decrypt(existing.access_token),
      access_secret: decrypt(existing.access_secret),
    };
  } catch {
    return NextResponse.json(
      { error: '保存済みトークンの復号に失敗しました。再登録してください。' },
      { status: 500 },
    );
  }

  const verified = await verifyXTokens(tokens);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error, errorCode: verified.errorCode },
      { status: verified.errorCode === 'invalid_tokens' ? 401 : 400 },
    );
  }

  const newName     = verified.user?.name ?? existing.name;
  const newUsername = verified.user?.username ?? null;
  const newImageUrl = verified.user?.profileImageUrl ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('x_accounts')
    .update({
      name:              newName,
      username:          newUsername,
      profile_image_url: newImageUrl,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, username, profile_image_url, is_active, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    account: data,
    verifiedUser: verified.user,
  });
}
