/**
 * 予約投稿用 Storage ヘルパー（永続バケット `post-uploads`）
 *
 * threads-uploads（即削除前提）とは別に、予約投稿は時刻が来るまでファイルを
 * 持っておく必要があるためこちらを使う。
 *
 * バケット作成は migration `20260521_post_uploads_storage.sql` を参照。
 */
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ScheduledImage } from '@/lib/scheduled-post-payload';

const BUCKET = 'post-uploads';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/gif':  'gif',
  'image/webp': 'webp',
};

/**
 * 単一画像を `post-uploads/{userId}/{uuid}.{ext}` にアップロードし、
 * 後段（X/Threads 投稿）で使う公開 URL を返す。
 */
export async function uploadPostImage(params: {
  userId: string;
  file: File;
}): Promise<ScheduledImage> {
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
  if (uploadError) throw new Error(`Storage アップロード失敗: ${uploadError.message}`);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    await admin.storage.from(BUCKET).remove([path]).catch(() => undefined);
    throw new Error('Storage public URL の取得に失敗しました');
  }
  return { path, publicUrl: data.publicUrl };
}

/**
 * 指定パスを bucket から削除する。投稿成立後/予約キャンセル時のクリーンアップ用。
 * 失敗してもログのみで例外は投げない（投稿フローを止めない）。
 */
export async function deletePostImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove(paths);
    if (error) console.error('[post-storage] 削除失敗:', error.message, paths);
  } catch (err) {
    console.error('[post-storage] 削除中に例外:', err);
  }
}

/**
 * 公開URLからバケット内パスを推定する（ヘルパー）。
 * `<SUPABASE_URL>/storage/v1/object/public/post-uploads/{path}` の {path} 部分を返す。
 * マッチしなければ null。
 */
export function extractPathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
