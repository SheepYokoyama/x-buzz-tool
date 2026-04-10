import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { encrypt, maskToken, decrypt } from '@/lib/encryption';

/** GET /api/x-accounts — マスク済みトークン一覧 */
export async function GET() {
  const supabase = getSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('x_accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const masked = (data ?? []).map((row: any) => ({
    id:                   row.id,
    name:                 row.name,
    username:             row.username ?? null,
    api_key_masked:       maskToken(row.api_key ? tryDecrypt(row.api_key) : null),
    api_secret_masked:    maskToken(row.api_secret ? tryDecrypt(row.api_secret) : null),
    access_token_masked:  maskToken(row.access_token ? tryDecrypt(row.access_token) : null),
    access_secret_masked: maskToken(row.access_secret ? tryDecrypt(row.access_secret) : null),
    bearer_token_masked:  row.bearer_token ? maskToken(tryDecrypt(row.bearer_token)) : null,
    is_active:            row.is_active,
    created_at:           row.created_at,
    updated_at:           row.updated_at,
  }));

  return NextResponse.json({ accounts: masked });
}

function tryDecrypt(s: string): string {
  try { return decrypt(s); } catch { return s; }
}

/** POST /api/x-accounts — 新規登録 */
export async function POST(req: Request) {
  const body = await req.json() as {
    name: string;
    username?: string;
    api_key: string;
    api_secret: string;
    access_token: string;
    access_secret: string;
    bearer_token?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'アカウント名は必須です' }, { status: 400 });
  }
  if (!body.api_key || !body.api_secret || !body.access_token || !body.access_secret) {
    return NextResponse.json({ error: '必須トークンが不足しています' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('x_accounts')
    .insert({
      name:          body.name.trim(),
      username:      body.username?.trim() || null,
      api_key:       encrypt(body.api_key),
      api_secret:    encrypt(body.api_secret),
      access_token:  encrypt(body.access_token),
      access_secret: encrypt(body.access_secret),
      bearer_token:  body.bearer_token ? encrypt(body.bearer_token) : null,
      is_active:     false,
    })
    .select('id, name, username, is_active, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: { ...data, api_key_masked: maskToken(body.api_key), api_secret_masked: maskToken(body.api_secret), access_token_masked: maskToken(body.access_token), access_secret_masked: maskToken(body.access_secret), bearer_token_masked: body.bearer_token ? maskToken(body.bearer_token) : null } });
}
