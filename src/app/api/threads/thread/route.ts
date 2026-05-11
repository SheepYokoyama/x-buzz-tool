import { NextResponse } from 'next/server';
import {
  getActiveThreadsAccessToken,
  getActiveThreadsAccountId,
  postThreadsSingle,
} from '@/lib/threads-client';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

type PostedThread = { threadId: string; url: string; text: string };

async function persistPublishedPosts(userId: string, posted: PostedThread[]): Promise<void> {
  if (posted.length === 0) return;
  try {
    const accountId = await getActiveThreadsAccountId(userId);
    const now = new Date().toISOString();
    const rows = posted.map((p) => ({
      content:       p.text,
      scheduled_at:  now,
      published_at:  now,
      status:        'published' as const,
      x_post_id:     p.threadId,
      x_post_url:    p.url,
      tags:          [] as string[],
      user_id:       userId,
      x_account_id:  accountId,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (getSupabaseAdmin() as any).from('scheduled_posts').insert(rows);
    if (error) console.error('persistPublishedPosts (threads): insert error', error);
  } catch (err) {
    console.error('persistPublishedPosts (threads): unexpected error', err);
  }
}

/**
 * POST /api/threads/thread
 * 複数ポストを Threads に投稿する。
 *
 * Content-Type: application/json
 *   body: { texts: string[]; mode: 'thread' | 'separate' }
 *
 * 画像添付は現時点では未対応（Phase 5 で公開URL方式で実装予定）。
 *
 * thread モードの場合、2件目以降は直前ポストの reply として連結する。
 * 途中で失敗した場合は、それまでに投稿できたものを返す。
 */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const accessToken = await getActiveThreadsAccessToken(user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Threads API の認証情報が設定されていません。アカウント管理でトークンを登録してください。' },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { texts?: string[]; mode?: 'thread' | 'separate' };
  const texts: string[] = Array.isArray(body.texts)
    ? (body.texts.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean) as string[])
    : [];
  const mode: 'thread' | 'separate' = body.mode === 'separate' ? 'separate' : 'thread';

  if (texts.length === 0) {
    return NextResponse.json({ error: '投稿テキストが空です' }, { status: 400 });
  }

  const posted: PostedThread[] = [];
  let lastId: string | undefined;

  try {
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const replyToId = mode === 'thread' ? lastId : undefined;
      const result = await postThreadsSingle({ accessToken, text, replyToId });
      const url = result.permalink ?? `https://www.threads.net/`;
      posted.push({ threadId: result.id, url, text });
      lastId = result.id;
    }
    await persistPublishedPosts(user.id, posted);
    return NextResponse.json({ posts: posted });
  } catch (err: unknown) {
    console.error('POST /api/threads/thread error:', err);
    await persistPublishedPosts(user.id, posted);
    const message = err instanceof Error ? err.message : '投稿に失敗しました';
    return NextResponse.json(
      { error: message, posted, failedAt: posted.length },
      { status: 500 },
    );
  }
}
