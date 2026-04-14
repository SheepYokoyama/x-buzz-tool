import { NextResponse } from 'next/server';
import { getActiveXClient } from '@/lib/x-client';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/x/metrics/[tweetId]
 * 指定ツイートのインプレッション・エンゲージメント指標を取得
 *
 * response: { metrics: TweetMetrics }
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tweetId: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { tweetId } = await params;

  if (!tweetId) {
    return NextResponse.json({ error: 'tweetId が必要です' }, { status: 400 });
  }

  const client = await getActiveXClient(user.id);
  if (!client) {
    return NextResponse.json(
      { error: 'X API の認証情報が設定されていません。' },
      { status: 503 }
    );
  }

  try {

    const tweet = await client.v2.singleTweet(tweetId, {
      'tweet.fields': ['public_metrics', 'non_public_metrics', 'organic_metrics', 'created_at'],
    });

    if (!tweet.data) {
      return NextResponse.json({ error: 'ツイートが見つかりません' }, { status: 404 });
    }

    const pub = tweet.data.public_metrics;
    const org = tweet.data.organic_metrics;   // Basic tier 以上で取得可能

    const metrics = {
      tweetId,
      createdAt:       tweet.data.created_at ?? null,
      // public_metrics（Free tier でも取得可能）
      impressions:     pub?.impression_count     ?? 0,
      likes:           pub?.like_count           ?? 0,
      retweets:        pub?.retweet_count        ?? 0,
      replies:         pub?.reply_count          ?? 0,
      quotes:          pub?.quote_count          ?? 0,
      bookmarks:       pub?.bookmark_count       ?? 0,
      // organic_metrics（Basic tier 以上）
      organicImpressions: org?.impression_count  ?? null,
      organicLikes:       org?.like_count        ?? null,
      organicRetweets:    org?.retweet_count      ?? null,
      organicReplies:     org?.reply_count        ?? null,
      // エンゲージメント率（likes + retweets + replies / impressions）
      engagementRate:
        pub?.impression_count && pub.impression_count > 0
          ? (
              ((pub.like_count ?? 0) + (pub.retweet_count ?? 0) + (pub.reply_count ?? 0)) /
              pub.impression_count
            ) * 100
          : 0,
    };

    return NextResponse.json({ metrics });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'メトリクスの取得に失敗しました';
    console.error('GET /api/x/metrics error:', err);

    if (message.includes('401') || message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'X API の認証に失敗しました。' }, { status: 401 });
    }
    if (message.includes('403')) {
      return NextResponse.json(
        { error: 'この操作には X API Basic プラン以上が必要です。' },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
