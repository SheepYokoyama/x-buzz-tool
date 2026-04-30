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
 * Content-Type:
 *   - application/json: { texts: string[]; mode: 'thread' | 'separate' }
 *   - multipart/form-data:
 *       - texts: JSON 文字列化した string[]
 *       - mode: 'thread' | 'separate'
 *       - images_${i}: File[] （i 件目のツイートに添付。各ツイート最大4枚）
 *
 * response: { posts: { tweetId: string; url: string; text: string }[] }
 *
 * thread の場合、2件目以降は直前のツイートに対する reply として投稿する。
 * 途中で失敗した場合は、それまでに投稿できたものを返しエラーを返す。
 */
const MAX_IMAGES_PER_TWEET = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

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

  let texts: string[] = [];
  let mode: 'thread' | 'separate' = 'thread';
  // chunkImages[i] は i 件目のツイートに添付する画像
  const chunkImages: File[][] = [];

  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const rawTexts = form.get('texts');
    if (typeof rawTexts === 'string') {
      try {
        const parsed = JSON.parse(rawTexts);
        if (Array.isArray(parsed)) {
          texts = parsed.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
        }
      } catch {
        return NextResponse.json({ error: 'texts のパースに失敗しました' }, { status: 400 });
      }
    }
    const rawMode = form.get('mode');
    mode = rawMode === 'separate' ? 'separate' : 'thread';

    for (let i = 0; i < texts.length; i++) {
      const files: File[] = [];
      for (const entry of form.getAll(`images_${i}`)) {
        if (entry instanceof File) files.push(entry);
      }
      if (files.length > MAX_IMAGES_PER_TWEET) {
        return NextResponse.json(
          { error: `${i + 1}件目の画像が上限（${MAX_IMAGES_PER_TWEET}枚）を超えています` },
          { status: 400 }
        );
      }
      for (const f of files) {
        if (!ALLOWED_IMAGE_MIMES.has(f.type)) {
          return NextResponse.json(
            { error: `${i + 1}件目に非対応の画像形式が含まれています: ${f.type || 'unknown'}` },
            { status: 400 }
          );
        }
        if (f.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: `${i + 1}件目の画像サイズが上限(5MB)を超えています: ${f.name}` },
            { status: 400 }
          );
        }
      }
      chunkImages.push(files);
    }
  } else {
    const body = (await req.json()) as { texts?: string[]; mode?: 'thread' | 'separate' };
    texts = Array.isArray(body.texts) ? body.texts.map((t) => t?.trim()).filter(Boolean) as string[] : [];
    mode = body.mode === 'separate' ? 'separate' : 'thread';
  }

  if (texts.length === 0) {
    return NextResponse.json({ error: '投稿テキストが空です' }, { status: 400 });
  }

  // 各ツイートに添付する media_ids を事前にアップロード
  const chunkMediaIds: string[][] = texts.map(() => []);
  for (let i = 0; i < chunkImages.length; i++) {
    const files = chunkImages[i];
    if (files.length === 0) continue;
    try {
      chunkMediaIds[i] = await Promise.all(
        files.map(async (f) => {
          const buf = Buffer.from(await f.arrayBuffer());
          return await client.v1.uploadMedia(buf, { mimeType: f.type });
        })
      );
    } catch (err: unknown) {
      console.error('uploadMedia error:', err);
      const msg = err instanceof Error ? err.message : '画像アップロードに失敗しました';
      return NextResponse.json(
        { error: `${i + 1}件目の画像アップロードに失敗しました: ${msg}` },
        { status: 502 }
      );
    }
  }

  const posted: PostedTweet[] = [];
  let lastId: string | undefined;

  try {
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const params: Record<string, unknown> = {};
      if (mode === 'thread' && lastId) {
        params.reply = { in_reply_to_tweet_id: lastId };
      }
      const mediaIds = chunkMediaIds[i] ?? [];
      if (mediaIds.length > 0) {
        params.media = { media_ids: mediaIds };
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
