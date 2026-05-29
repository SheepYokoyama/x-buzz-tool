import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/instagram/me
 * 連携中の Instagram アカウント情報を返す（DB に保存済みの情報を返すのみ）。
 * 最新プロフィール再取得は /api/instagram-accounts/[id]/refresh で行う。
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('social_accounts')
    .select('id, name, username, profile_image_url')
    .eq('user_id', user.id)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id:              data.id,
      name:            data.name,
      username:        data.username ?? '',
      profileImageUrl: data.profile_image_url ?? null,
    },
  });
}
