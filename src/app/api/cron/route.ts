import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveXClient, getActiveXAccountId } from '@/lib/x-client';

export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  // localhost からのリクエストは開発用としてスキップ
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

type PostResult =
  | { id: string; status: 'published'; tweetId: string; url: string }
  | { id: string; status: 'skipped'; reason: string }
  | { id: string; status: 'failed'; error: string };

/**
 * GET /api/cron
 *
 * Vercel Cron から定期的に呼ばれ、scheduled_at が過去の予約投稿を X に送信する。
 * X API が未設定の場合は投稿をスキップし、ステータスは変更しない。
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // 投稿期限を過ぎた予約済み投稿を取得（古い順）
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('[cron] DB fetch error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = data ?? [];

  if (posts.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const [xClient, activeAccountId] = await Promise.all([
    getActiveXClient(),
    getActiveXAccountId(),
  ]);
  const results: PostResult[] = [];

  for (const post of posts) {
    // X API 未設定: スキップ（ステータスは変えない）
    if (!xClient) {
      results.push({ id: post.id, status: 'skipped', reason: 'X API not configured' });
      continue;
    }

    try {
      const { data: tweet } = await xClient.v2.tweet(post.content as string);
      const tweetId = tweet.id;
      const url     = `https://x.com/i/web/status/${tweetId}`;

      const { error: updateError } = await supabase
        .from('scheduled_posts')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          status:        'published',
          published_at:  new Date().toISOString(),
          x_post_id:     tweetId,
          x_post_url:    url,
          x_account_id:  activeAccountId,
        } as any)
        .eq('id', post.id);

      if (updateError) {
        console.error(`[cron] DB update failed for ${post.id}:`, updateError.message);
      }

      results.push({ id: post.id, status: 'published', tweetId, url });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown error';
      console.error(`[cron] Tweet failed for ${post.id}:`, message);

      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed' })
        .eq('id', post.id);

      results.push({ id: post.id, status: 'failed', error: message });
    }
  }

  const published = results.filter((r) => r.status === 'published').length;
  const failed    = results.filter((r) => r.status === 'failed').length;
  const skipped   = results.filter((r) => r.status === 'skipped').length;

  console.log(`[cron] processed=${posts.length} published=${published} failed=${failed} skipped=${skipped}`);

  return NextResponse.json({ processed: posts.length, published, failed, skipped, results });
}
