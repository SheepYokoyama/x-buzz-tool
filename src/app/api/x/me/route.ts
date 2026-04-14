import { NextResponse } from 'next/server';
import { getActiveXClient } from '@/lib/x-client';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/x/me
 * 連携中の X アカウント情報を返す（1回だけ呼ぶ想定）
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const client = await getActiveXClient(user.id);
  if (!client) {
    return NextResponse.json({ user: null });   // 未設定は静かに null
  }

  try {
    const { data } = await client.v2.me({
      'user.fields': ['name', 'username', 'profile_image_url', 'verified_type', 'subscription_type'],
    });

    const raw = data as { verified_type?: string; subscription_type?: string };
    const verifiedType     = raw.verified_type     ?? null;
    const subscriptionType = raw.subscription_type ?? null;

    return NextResponse.json({
      user: {
        id:               data.id,
        name:             data.name,
        username:         data.username,
        profileImageUrl:  data.profile_image_url ?? null,
        verifiedType,
        subscriptionType,
      },
    });
  } catch (err) {
    console.error('GET /api/x/me error:', err);
    return NextResponse.json({ user: null });   // エラーも静かに null
  }
}
