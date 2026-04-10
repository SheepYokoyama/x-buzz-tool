import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { encrypt, maskToken } from '@/lib/encryption';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/x-accounts/[id] — 更新（トークンは空なら変更しない） */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    username?: string;
    api_key?: string;
    api_secret?: string;
    access_token?: string;
    access_secret?: string;
    bearer_token?: string;
    is_active?: boolean;
  };

  const supabase = getSupabaseAdmin();

  // 更新対象フィールドを構築（空文字トークンは更新しない）
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
  });
}

/** DELETE /api/x-accounts/[id] */
export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('x_accounts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
