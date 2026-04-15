import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/follow-hunt/candidates
 * pending のフォロー候補一覧 + 本日フォロー数を返す
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseAdmin() as any;

  const { data: candidates, error } = await sb
    .from('follow_candidates')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('GET /api/follow-hunt/candidates error:', error);
    return NextResponse.json({ error: '候補の取得に失敗しました' }, { status: 500 });
  }

  // 本日フォロー数（UTC ではなくローカル判定: followed_at >= 24時間前の簡易版）
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { count: followedToday } = await sb
    .from('follow_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'followed')
    .gte('followed_at', startOfToday.toISOString());

  return NextResponse.json({
    candidates: candidates ?? [],
    followed_today: followedToday ?? 0,
  });
}
