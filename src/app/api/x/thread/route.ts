import { NextResponse } from 'next/server';
import { getActiveXClient, getActiveXAccountId } from '@/lib/x-client';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

type PostedTweet = { tweetId: string; url: string; text: string };

async function persistPublishedPosts(userId: string, posted: PostedTweet[]): Promise<void> {
  if (posted.length === 0) return;
  try {
    const xAccountId = await getActiveXAccountId(userId);
    const now = new Date().toISOString();
    const rows = posted.map((p) => ({
      content:       p.text,
      scheduled_at:  now,
      published_at:  now,
      status:        'published' as const,
      x_post_id:     p.tweetId,
      x_post_url:    p.url,
      tags:          [] as string[],
      user_id:       userId,
      x_account_id:  xAccountId,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (getSupabaseAdmin() as any).from('scheduled_posts').insert(rows);
    if (error) console.error('persistPublishedPosts: insert error', error);
  } catch (err) {
    console.error('persistPublishedPosts: unexpected error', err);
  }
}

/**
 * POST /api/x/thread
 * 複数ポストを X に投稿する。
 *
 * body: {
 *   texts: string[];     // 投稿テキスト配列（1件以上）
 *   mode: 'thread' | 'separate'; // thread: リプライで繋げる / separate: それぞれ独立
 * }
 * response: { posts: { tweetId: string; url: string; text: string }[] }
 *
 * thread の場合、2件目以降は直前のツイートに対する reply として投稿する。
 * 途中で失敗した場合は、それまでに投稿できたものを返しエラーを返す。
 */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const client = await getActiveXClient(user.id);
  if (!client) {
    return NextResponse.json(
      { error: 'X API の認証情報が設定されていません。Xアカウント管理でトークンを登録してください。' },
      { status: 503 }
    );
  }

  const body = (await req.json()) as { texts?: string[]; mode?: 'thread' | 'separate' };
  const texts = Array.isArray(body.texts) ? body.texts.map((t) => t?.trim()).filter(Boolean) as string[] : [];
  const mode = body.mode === 'separate' ? 'separate' : 'thread';

  if (texts.length === 0) {
    return NextResponse.json({ error: '投稿テキストが空です' }, { status: 400 });
  }

  const posted: PostedTweet[] = [];
  let lastId: string | undefined;

  try {
    for (const text of texts) {
      const params: Record<string, unknown> = {};
      if (mode === 'thread' && lastId) {
        params.reply = { in_reply_to_tweet_id: lastId };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await client.v2.tweet(text, params as any);
      const tweetId = data.id;
      const url = `https://x.com/i/web/status/${tweetId}`;
      posted.push({ tweetId, url, text });
      lastId = tweetId;
    }
    await persistPublishedPosts(user.id, posted);
    return NextResponse.json({ posts: posted });
  } catch (err: unknown) {
    console.error('POST /api/x/thread error:', err);
    // 部分成功した投稿は DB に保存しておく（ダッシュボード反映のため）
    await persistPublishedPosts(user.id, posted);
    const apiErr = err as {
      code?: number;
      data?: { detail?: string; errors?: { message?: string }[] };
      message?: string;
    };
    const httpCode = apiErr.code ?? 500;
    const detail =
      apiErr.data?.detail ??
      apiErr.data?.errors?.[0]?.message ??
      (err instanceof Error ? err.message : '投稿に失敗しました');

    if (detail.toLowerCase().includes('duplicate')) {
      return NextResponse.json(
        { error: '同じ内容の投稿は重複して投稿できません。', posted, failedAt: posted.length },
        { status: 422 }
      );
    }
    if (httpCode === 401) {
      return NextResponse.json(
        { error: 'X API の認証に失敗しました。トークンを確認してください。', posted, failedAt: posted.length },
        { status: 401 }
      );
    }
    if (httpCode === 403) {
      return NextResponse.json(
        { error: `投稿が拒否されました（X側の制限）: ${detail}`, posted, failedAt: posted.length },
        { status: 403 }
      );
    }
    if (httpCode === 429) {
      return NextResponse.json(
        { error: 'X API のレート制限に達しました。しばらくお待ちください。', posted, failedAt: posted.length },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: detail, posted, failedAt: posted.length },
      { status: httpCode > 0 ? httpCode : 500 }
    );
  }
}
