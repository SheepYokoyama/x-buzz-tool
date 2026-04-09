import { NextResponse } from 'next/server';
import { getXClient, isXConfigured } from '@/lib/x-client';

/**
 * GET /api/x/me
 * 連携中の X アカウント情報を返す（1回だけ呼ぶ想定）
 */
export async function GET() {
  if (!isXConfigured()) {
    return NextResponse.json({ user: null });   // 未設定は静かに null
  }

  try {
    const client = getXClient()!;
    const { data } = await client.v2.me({
      'user.fields': ['name', 'username', 'profile_image_url'],
    });

    return NextResponse.json({
      user: {
        id:               data.id,
        name:             data.name,
        username:         data.username,
        profileImageUrl:  data.profile_image_url ?? null,
      },
    });
  } catch (err) {
    console.error('GET /api/x/me error:', err);
    return NextResponse.json({ user: null });   // エラーも静かに null
  }
}
