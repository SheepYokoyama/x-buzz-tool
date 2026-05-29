import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { encrypt, maskToken, decrypt } from '@/lib/encryption';
import { verifyInstagramTokens } from '@/lib/instagram-client';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/instagram-accounts/[id] — 更新（トークンは空なら変更しない） */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    username?: string;
    access_token?: string;
  };

  const supabase = getSupabaseAdmin();

  const hasTokenChange = !!body.access_token?.trim();

  let verifiedUsername: string | null = null;
  let verifiedProfileImageUrl: string | null = null;

  if (hasTokenChange) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('social_accounts')
      .select('access_token')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'アカウントが見つかりません' }, { status: 404 });
    }

    const token = body.access_token?.trim() || tryDecrypt(existing.access_token);
    const verified = await verifyInstagramTokens({ access_token: token });
    if (!verified.ok) {
      return NextResponse.json(
        { error: verified.error, errorCode: verified.errorCode },
        { status: verified.errorCode === 'invalid_token' ? 401 : 400 },
      );
    }
    verifiedUsername        = verified.user?.username ?? null;
    verifiedProfileImageUrl = verified.user?.profileImageUrl ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined)         updates.name         = body.name.trim();
  if (body.username !== undefined)     updates.username     = body.username.trim() || null;
  if (body.access_token?.trim())       updates.access_token = encrypt(body.access_token);
  if (hasTokenChange) {
    if (verifiedUsername !== null) updates.username = verifiedUsername;
    updates.profile_image_url = verifiedProfileImageUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('social_accounts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('platform', 'instagram')
    .select('id, platform, name, username, profile_image_url, is_active, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    account: {
      ...data,
      access_token_masked: body.access_token?.trim() ? maskToken(body.access_token) : undefined,
    },
    verifiedUsername,
  });
}

function tryDecrypt(s: string): string {
  try { return decrypt(s); } catch { return s; }
}

/** DELETE /api/instagram-accounts/[id] */
export async function DELETE(req: Request, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('social_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('platform', 'instagram');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
