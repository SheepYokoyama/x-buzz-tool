/**
 * Instagram 画像投稿用の Supabase Storage ヘルパー
 *
 * Instagram Graph API は画像の直接アップロードを受け付けず、公開URL（image_url）の
 * 指定のみをサポートする。そのため:
 *   1. 投稿APIに添付された画像を一旦 Supabase Storage の `instagram-uploads` バケットに
 *      上げ、public URL を取得する。
 *   2. その URL を Meta Graph API に渡して投稿。
 *   3. 投稿成立後（成功/失敗にかかわらず）Storage 上のファイルは削除する。
 *
 * バケットは migration `20260529_instagram_uploads_storage.sql` で作成済み。
 * 削除は best-effort（失敗してもログのみで握りつぶす）。
 */
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

const BUCKET = 'instagram-uploads';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/gif':  'gif',
  'image/webp': 'webp',
};

export interface UploadedInstagramImage {
  /** バケット内の path（削除時に使用）*/
  path: string;
  /** Meta Graph API に渡す public URL */
  publicUrl: string;
}

/**
 * 単一の画像ファイルを `instagram-uploads/{userId}/{uuid}.{ext}` へアップロードし、
 * Meta Graph API に渡すための public URL を返す。
 */
export async function uploadInstagramImage(params: {
  userId: string;
  file: File;
}): Promise<UploadedInstagramImage> {
  const { userId, file } = params;
  if (!userId) throw new Error('userId が空です');
  const ext = EXT_BY_MIME[file.type];
  if (!ext) throw new Error(`非対応の画像 MIME タイプ: ${file.type || 'unknown'}`);

  const path = `${userId}/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const admin = getSupabaseAdmin();
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    cacheControl: 'no-store',
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`Storage アップロード失敗: ${uploadError.message}`);
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    // 失敗時はアップロード済みファイルを掃除してから例外
    await admin.storage.from(BUCKET).remove([path]).catch(() => undefined);
    throw new Error('Storage public URL の取得に失敗しました');
  }

  return { path, publicUrl: data.publicUrl };
}

/**
 * 指定パスを bucket から削除する。投稿フロー終了後のクリーンアップ用。
 * 失敗してもログ出力のみで例外を投げない（投稿は既に終わっているため）。
 */
export async function deleteInstagramImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove(paths);
    if (error) {
      console.error('[instagram-storage] 削除失敗:', error.message, paths);
    }
  } catch (err) {
    console.error('[instagram-storage] 削除中に例外:', err);
  }
}
