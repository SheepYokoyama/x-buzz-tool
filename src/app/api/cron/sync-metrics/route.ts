import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { getActiveXClient } from '@/lib/x-client';

export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

type SyncResult =
  | { id: string; tweetId: string; status: 'synced'; likes: number; impressions: number }
  | { id: string; tweetId: string; status: 'skipped'; reason: string }
  | { id: string; tweetId: string; status: 'failed'; error: string };

/**
 * GET /api/cron/sync-metrics
 *
 * 公開済み投稿の X メトリクス（いいね・インプレッション等）を取得して
 * post_metrics テーブルに upsert する。
 * Vercel Cron または手動で呼び出す。
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const xClient = await getActiveXClient();
  if (!xClient) {
    return NextResponse.json(
      { error: 'X API が設定されていません。Xアカウント管理でトークンを登録してください。' },
      { status: 503 },
    );
  }

  const supabase = getSupabaseServer();

  // x_post_id を持つ公開済み投稿を全件取得
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('id, x_post_id')
    .eq('status', 'published')
    .not('x_post_id', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (data ?? []) as { id: string; x_post_id: string }[];

  if (posts.length === 0) {
    return NextResponse.json({ synced: 0, results: [] });
  }

  const results: SyncResult[] = [];

  for (const post of posts) {
    const tweetId = post.x_post_id;

    try {
      const tweet = await xClient.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics', 'created_at'],
      });

      if (!tweet.data?.public_metrics) {
        results.push({ id: post.id, tweetId, status: 'skipped', reason: 'メトリクスなし' });
        continue;
      }

      const pub = tweet.data.public_metrics;
      const likes       = pub.like_count       ?? 0;
      const retweets    = pub.retweet_count     ?? 0;
      const replies     = pub.reply_count       ?? 0;
      const impressions = pub.impression_count  ?? 0;
      const bookmarks   = pub.bookmark_count    ?? 0;
      const engagementRate =
        impressions > 0
          ? ((likes + retweets + replies) / impressions) * 100
          : 0;

      const { error: upsertError } = await supabase.from('post_metrics').upsert(
        {
          scheduled_post_id: post.id,
          measured_at:       new Date().toISOString(),
          likes,
          retweets,
          replies,
          impressions,
          bookmarks,
          engagement_rate: Math.round(engagementRate * 100) / 100,
        },
        // 同じ投稿の同一分内の重複を避けるため scheduled_post_id で upsert
        // ※ テーブルに unique 制約がなければ insert になるが問題なし
      );

      if (upsertError) {
        results.push({ id: post.id, tweetId, status: 'failed', error: upsertError.message });
      } else {
        results.push({ id: post.id, tweetId, status: 'synced', likes, impressions });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown error';
      console.error(`[sync-metrics] tweetId=${tweetId}:`, message);
      results.push({ id: post.id, tweetId, status: 'failed', error: message });
    }
  }

  const synced  = results.filter((r) => r.status === 'synced').length;
  const failed  = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  console.log(`[sync-metrics] total=${posts.length} synced=${synced} failed=${failed} skipped=${skipped}`);

  return NextResponse.json({ synced, failed, skipped, results });
}
