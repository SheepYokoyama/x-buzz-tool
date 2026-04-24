import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { encrypt, maskToken, decrypt } from '@/lib/encryption';
import { verifyXTokens } from '@/lib/x-client';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/x-accounts/[id] — 更新（トークンは空なら変更しない） */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    username?: string;
    api_key?: string;
    api_secret?: string;
    access_token?: string;
    access_secret?: string;
    bearer_token?: string;
  };

  const supabase = getSupabaseAdmin();

  const hasTokenChange =
    !!(body.api_key?.trim() || body.api_secret?.trim() || body.access_token?.trim() || body.access_secret?.trim());

  // トークン変更がある場合は既存トークンをマージして X API で検証
  let verifiedUsername: string | null = null;
  if (hasTokenChange) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('x_accounts')
      .select('api_key, api_secret, access_token, access_secret')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'アカウントが見つかりません' }, { status: 404 });
    }

    const merged = {
      api_key:       body.api_key?.trim()       || tryDecrypt(existing.api_key),
      api_secret:    body.api_secret?.trim()    || tryDecrypt(existing.api_secret),
      access_token:  body.access_token?.trim()  || tryDecrypt(existing.access_token),
      access_secret: body.access_secret?.trim() || tryDecrypt(existing.access_secret),
    };

    const verified = await verifyXTokens(merged);
    if (!verified.ok) {
      return NextResponse.json(
        { error: verified.error, errorCode: verified.errorCode },
        { status: verified.errorCode === 'invalid_tokens' ? 401 : 400 },
      );
    }
    verifiedUsername = verified.user?.username ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined)      updates.name     = body.name.trim();
  if (body.username !== undefined)  updates.username = body.username.trim() || null;
  if (body.api_key?.trim())         updates.api_key      = encrypt(body.api_key);
  if (body.api_secret?.trim())      updates.api_secret   = encrypt(body.api_secret);
  if (body.access_token?.trim())    updates.access_token  = encrypt(body.access_token);
  if (body.access_secret?.trim())   updates.access_secret = encrypt(body.access_secret);
  if (body.bearer_token !== undefined) {
    updates.bearer_token = body.bearer_token?.trim() ? encrypt(body.bearer_token) : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('x_accounts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, username, is_active, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    account: {
      ...data,
      api_key_masked:       body.api_key?.trim()       ? maskToken(body.api_key)       : undefined,
      api_secret_masked:    body.api_secret?.trim()    ? maskToken(body.api_secret)    : undefined,
      access_token_masked:  body.access_token?.trim()  ? maskToken(body.access_token)  : undefined,
      access_secret_masked: body.access_secret?.trim() ? maskToken(body.access_secret) : undefined,
      bearer_token_masked:  body.bearer_token?.trim()  ? maskToken(body.bearer_token)  : undefined,
    },
    verifiedUsername,
  });
}

function tryDecrypt(s: string): string {
  try { return decrypt(s); } catch { return s; }
}

/** DELETE /api/x-accounts/[id] */
export async function DELETE(req: Request, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('x_accounts').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
