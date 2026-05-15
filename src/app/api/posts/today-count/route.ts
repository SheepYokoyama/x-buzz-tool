import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/posts/today-count
 *
 * 過去 24 時間で公開済みの投稿数を X / Threads 別に返す。
 * BAN 回避ガイドのソフトリミット（X: 100/日、Threads: 250/24h）の判定に使う。
 *
 * scheduled_posts.x_account_id は social_accounts.id（X / Threads 両対応）を指すので、
 * social_accounts.platform で分類する。
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const supabase = getSupabaseAdmin();
  // 過去 24 時間に published になったポストを、所属アカウントの platform 付きで取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_posts')
    .select('id, social_accounts:x_account_id (platform)')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .gte('published_at', since);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let xCount = 0;
  let threadsCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    const platform = row?.social_accounts?.platform ?? null;
    if (platform === 'threads') threadsCount += 1;
    else xCount += 1;   // platform 不明 / 'x' は X として集計
  }

  return NextResponse.json({
    x: xCount,
    threads: threadsCount,
    /** ソフトリミット（参考値・BAN 回避ガイド準拠） */
    limits: { x: 100, threads: 250 },
    /** 集計の時間窓 */
    windowHours: 24,
  });
}
