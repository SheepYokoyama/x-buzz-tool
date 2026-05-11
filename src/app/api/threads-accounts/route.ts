import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { encrypt, maskToken, decrypt } from '@/lib/encryption';
import { verifyThreadsTokens } from '@/lib/threads-client';

/** GET /api/threads-accounts — ログインユーザーの Threads アカウント一覧（マスク済み） */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('social_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const masked = (data ?? []).map((row: any) => ({
    id:                   row.id,
    platform:             row.platform,
    name:                 row.name,
    username:             row.username ?? null,
    profile_image_url:    row.profile_image_url ?? null,
    access_token_masked:  maskToken(row.access_token ? tryDecrypt(row.access_token) : null),
    api_key_masked:       null,
    api_secret_masked:    null,
    access_secret_masked: null,
    bearer_token_masked:  null,
    is_active:            row.is_active,
    created_at:           row.created_at,
    updated_at:           row.updated_at,
  }));

  return NextResponse.json({ accounts: masked });
}

function tryDecrypt(s: string): string {
  try { return decrypt(s); } catch { return s; }
}

/** POST /api/threads-accounts — 新規登録（1ユーザー1件のみ） */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    access_token: string;
  };

  if (!body.access_token) {
    return NextResponse.json({ error: 'アクセストークンは必須です' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 既存チェック（1ユーザー×Threads 1件のみ）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('social_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Threadsアカウントは1件のみ登録できます' }, { status: 409 });
  }

  // ── Threads API で認証確立を確認 ──
  const verified = await verifyThreadsTokens({ access_token: body.access_token });
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error, errorCode: verified.errorCode },
      { status: verified.errorCode === 'invalid_token' ? 401 : 400 },
    );
  }

  const effectiveName     = body.name?.trim() || verified.user?.name || verified.user?.username || 'Threadsアカウント';
  const effectiveUsername = verified.user?.username ?? null;
  const profileImageUrl   = verified.user?.profileImageUrl ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('social_accounts')
    .insert({
      user_id:           user.id,
      platform:          'threads',
      name:              effectiveName,
      username:          effectiveUsername,
      profile_image_url: profileImageUrl,
      access_token:      encrypt(body.access_token),
      is_active:         true,
    })
    .select('id, platform, name, username, profile_image_url, is_active, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    account: {
      ...data,
      access_token_masked:  maskToken(body.access_token),
      api_key_masked:       null,
      api_secret_masked:    null,
      access_secret_masked: null,
      bearer_token_masked:  null,
    },
    verifiedUser: verified.user,
  });
}
