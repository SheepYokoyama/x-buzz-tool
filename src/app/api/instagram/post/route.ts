import { NextResponse } from 'next/server';
import {
  getActiveInstagramAccessToken,
  getActiveInstagramAccountId,
  postInstagramSingle,
  INSTAGRAM_CAPTION_MAX,
} from '@/lib/instagram-client';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  uploadInstagramImage,
  deleteInstagramImages,
  type UploadedInstagramImage,
} from '@/lib/instagram-storage';

type PostedMedia = { mediaId: string; url: string; caption: string };

async function persistPublishedPost(userId: string, posted: PostedMedia): Promise<void> {
  try {
    const accountId = await getActiveInstagramAccountId(userId);
    const now = new Date().toISOString();
    const row = {
      content:       posted.caption,
      scheduled_at:  now,
      published_at:  now,
      status:        'published' as const,
      x_post_id:     posted.mediaId,
      x_post_url:    posted.url,
      tags:          [] as string[],
      user_id:       userId,
      x_account_id:  accountId,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (getSupabaseAdmin() as any).from('scheduled_posts').insert([row]);
    if (error) console.error('persistPublishedPost (instagram): insert error', error);
  } catch (err) {
    console.error('persistPublishedPost (instagram): unexpected error', err);
  }
}

/**
 * POST /api/instagram/post
 * 単一の Instagram フィード投稿を行う。Instagram は画像が1枚以上必須。
 *
 * Content-Type:
 *   - multipart/form-data:
 *       - caption: string（最大2,200文字）
 *       - images:  File[]（1〜10枚。2枚以上はカルーセル）
 *
 * Instagram Graph API は画像を直接アップロードできない（公開URL方式のみ）。
 * 各画像を Supabase Storage の `instagram-uploads` バケットに一時アップロードし、
 * 公開URLを Meta Graph API に渡して投稿、投稿成立後に Storage から削除する。
 */
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const accessToken = await getActiveInstagramAccessToken(user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Instagram API の認証情報が設定されていません。アカウント管理でトークンを登録してください。' },
      { status: 503 },
    );
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Instagram 投稿は multipart/form-data（画像必須）で送信してください' },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const caption = (form.get('caption') as string | null)?.trim() ?? '';

  if (caption.length > INSTAGRAM_CAPTION_MAX) {
    return NextResponse.json(
      { error: `キャプションが上限（${INSTAGRAM_CAPTION_MAX}文字）を超えています（現在 ${caption.length}）` },
      { status: 400 },
    );
  }

  const files: File[] = [];
  for (const entry of form.getAll('images')) {
    if (entry instanceof File) files.push(entry);
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'Instagram 投稿には画像が1枚以上必要です' }, { status: 400 });
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `画像が上限（${MAX_IMAGES}枚）を超えています` },
      { status: 400 },
    );
  }
  for (const f of files) {
    if (!ALLOWED_IMAGE_MIMES.has(f.type)) {
      return NextResponse.json(
        { error: `非対応の画像形式が含まれています: ${f.type || 'unknown'}` },
        { status: 400 },
      );
    }
    if (f.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `画像サイズが上限(5MB)を超えています: ${f.name}` },
        { status: 400 },
      );
    }
  }

  // ── 画像を Supabase Storage にアップロードして公開URL化 ────────────
  const uploaded: UploadedInstagramImage[] = [];
  const uploadedPaths: string[] = [];
  try {
    const results = await Promise.all(
      files.map((file) => uploadInstagramImage({ userId: user.id, file })),
    );
    for (const u of results) {
      uploaded.push(u);
      uploadedPaths.push(u.path);
    }
  } catch (err: unknown) {
    console.error('[instagram/post] storage upload error:', err);
    if (uploadedPaths.length > 0) await deleteInstagramImages(uploadedPaths);
    const msg = err instanceof Error ? err.message : '画像アップロードに失敗しました';
    return NextResponse.json(
      { error: `Instagram 用画像アップロードに失敗しました: ${msg}` },
      { status: 502 },
    );
  }

  try {
    const result = await postInstagramSingle({
      accessToken,
      caption,
      imageUrls: uploaded.map((u) => u.publicUrl),
    });
    const url = result.permalink ?? 'https://www.instagram.com/';
    const posted: PostedMedia = { mediaId: result.id, url, caption };
    await persistPublishedPost(user.id, posted);
    return NextResponse.json({ post: posted });
  } catch (err: unknown) {
    console.error('POST /api/instagram/post error:', err);
    const message = err instanceof Error ? err.message : '投稿に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (uploadedPaths.length > 0) await deleteInstagramImages(uploadedPaths);
  }
}
