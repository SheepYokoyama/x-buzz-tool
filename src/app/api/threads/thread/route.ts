import { NextResponse } from 'next/server';
import {
  getActiveThreadsAccessToken,
  getActiveThreadsAccountId,
  postThreadsSingle,
} from '@/lib/threads-client';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { guardImmediatePost } from '@/lib/post-safety';
import {
  uploadThreadsImage,
  deleteThreadsImages,
  type UploadedThreadsImage,
} from '@/lib/threads-storage';

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
 * Content-Type:
 *   - application/json: { texts: string[]; mode: 'thread' | 'separate' }
 *   - multipart/form-data:
 *       - texts: JSON 文字列化した string[]
 *       - mode: 'thread' | 'separate'
 *       - images_${i}: File[] （i 件目に添付。各ポスト最大4枚）
 *
 * Meta Threads API は画像を直接アップロードできない（公開URL方式のみ）。
 * このルートでは各画像を Supabase Storage の `threads-uploads` バケットに一時アップロードし、
 * 公開URLを Meta Graph API に渡して投稿、投稿成立後に Storage から削除する。
 *
 * thread モードの場合、2件目以降は直前ポストの reply として連結する。
 * 途中で失敗した場合は、それまでに投稿できたものを返す。
 */
const MAX_IMAGES_PER_POST = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

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

  let texts: string[] = [];
  let mode: 'thread' | 'separate' = 'thread';
  // chunkImages[i] = i 件目のポストに添付する画像
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
      if (files.length > MAX_IMAGES_PER_POST) {
        return NextResponse.json(
          { error: `${i + 1}件目の画像が上限（${MAX_IMAGES_PER_POST}枚）を超えています` },
          { status: 400 },
        );
      }
      for (const f of files) {
        if (!ALLOWED_IMAGE_MIMES.has(f.type)) {
          return NextResponse.json(
            { error: `${i + 1}件目に非対応の画像形式が含まれています: ${f.type || 'unknown'}` },
            { status: 400 },
          );
        }
        if (f.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: `${i + 1}件目の画像サイズが上限(5MB)を超えています: ${f.name}` },
            { status: 400 },
          );
        }
      }
      chunkImages.push(files);
    }
  } else {
    const body = (await req.json()) as { texts?: string[]; mode?: 'thread' | 'separate' };
    texts = Array.isArray(body.texts)
      ? (body.texts.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean) as string[])
      : [];
    mode = body.mode === 'separate' ? 'separate' : 'thread';
  }

  if (texts.length === 0) {
    return NextResponse.json({ error: '投稿テキストが空です' }, { status: 400 });
  }

  // 構造的セーフティ: 二重送信の重複投稿 / 24h 総量の暴走を防ぐ（先頭ポストで判定）
  // Threads(Meta) は同一文面の重複を弾かないため特に重要。
  const guard = await guardImmediatePost(user.id, texts[0]);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  // ── 画像を Supabase Storage にアップロードして公開URL化 ────────────
  //   chunkUploaded[i] には i 件目のポストに使う UploadedThreadsImage[] が入る。
  //   失敗した場合は既にアップロード済みのものを全て掃除してエラー応答。
  const chunkUploaded: UploadedThreadsImage[][] = texts.map(() => []);
  const allUploadedPaths: string[] = [];
  try {
    for (let i = 0; i < chunkImages.length; i++) {
      const files = chunkImages[i];
      if (files.length === 0) continue;
      const uploaded = await Promise.all(
        files.map((file) => uploadThreadsImage({ userId: user.id, file })),
      );
      chunkUploaded[i] = uploaded;
      for (const u of uploaded) allUploadedPaths.push(u.path);
    }
  } catch (err: unknown) {
    console.error('[threads/thread] storage upload error:', err);
    // 既にアップロードされたものを掃除
    if (allUploadedPaths.length > 0) {
      await deleteThreadsImages(allUploadedPaths);
    }
    const msg = err instanceof Error ? err.message : '画像アップロードに失敗しました';
    return NextResponse.json(
      { error: `Threads 用画像アップロードに失敗しました: ${msg}` },
      { status: 502 },
    );
  }

  const posted: PostedThread[] = [];
  let lastId: string | undefined;

  try {
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const replyToId = mode === 'thread' ? lastId : undefined;
      const imageUrls = (chunkUploaded[i] ?? []).map((u) => u.publicUrl);
      const result = await postThreadsSingle({ accessToken, text, replyToId, imageUrls });
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
  } finally {
    // 投稿フロー終了後（成功/失敗にかかわらず）Storage の一時画像をクリーンアップ。
    // Threads 側は permalink 表示時に再フェッチしないため即削除して問題ない。
    if (allUploadedPaths.length > 0) {
      await deleteThreadsImages(allUploadedPaths);
    }
  }
}
