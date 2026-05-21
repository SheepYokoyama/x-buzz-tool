import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { deletePostImages } from '@/lib/post-storage';
import {
  isPayloadV1,
  collectImagePaths,
} from '@/lib/scheduled-post-payload';

/**
 * DELETE /api/scheduled-posts/[id]
 * 予約投稿を1件削除する。payload に画像が含まれていれば post-uploads から
 * 該当オブジェクトも削除する。
 *
 * 既存 UI（ScheduledPostItem）は supabase browser から直接 delete していたが、
 * ブラウザからは Service Role を持たないため Storage の他人ファイル削除ができない。
 * 画像クリーンアップを確実に行うためサーバー側に集約する。
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any;

  // 自分の予約か確認しつつ payload を取得（RLS バイパスなので user_id 必須）
  const { data: post, error: fetchError } = await admin
    .from('scheduled_posts')
    .select('id, payload')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!post)      return NextResponse.json({ error: '対象の予約が見つかりません' }, { status: 404 });

  // DELETE 実行
  const { error: deleteError } = await admin
    .from('scheduled_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  // 画像クリーンアップ（失敗してもDB削除はすでに成立しているので best-effort）
  if (isPayloadV1(post.payload)) {
    const paths = collectImagePaths(post.payload);
    if (paths.length > 0) await deletePostImages(paths);
  }

  return NextResponse.json({ ok: true });
}
