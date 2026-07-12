import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { deletePostImages } from '@/lib/post-storage';
import { verifyThothApiKey } from '@/lib/thoth-partner';
import { isPayloadV1, collectImagePaths } from '@/lib/scheduled-post-payload';

/**
 * Thoth 連携の補助 API（仕様書 §2「補助API」）。
 * 対象は Thoth 経由で作られた予約（payload.partner.source = 'thoth'）のみ。
 * Xpresso UI 起点の予約はこの API から参照・操作できない。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchThothPost(admin: any, id: string) {
  const { data, error } = await admin
    .from('scheduled_posts')
    .select('id, status, scheduled_at, published_at, x_post_id, x_post_url, locked_at, payload')
    .eq('id', id)
    .eq('payload->partner->>source', 'thoth')
    .maybeSingle();
  return { data, error };
}

/**
 * GET /api/v1/scheduled-posts/[id]
 * 予約の現在状態を返す（Webhook 欠落時の Thoth 側フォールバック用）。
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = verifyThothApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any;
  const { data: post, error } = await fetchThothPost(admin, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: '対象の予約が見つかりません' }, { status: 404 });

  const payload = isPayloadV1(post.payload) ? post.payload : null;
  return NextResponse.json({
    expressoPostId: post.id,
    thothPostId: payload?.partner?.thothPostId ?? null,
    status: post.status,
    scheduledAt: post.scheduled_at,
    postedAt: post.published_at,
    xPostId: post.x_post_id,
    postUrl: post.x_post_url,
    threadsPostId: payload?.results?.threads?.[0]?.postId ?? null,
    error: payload?.results?.errors
      ? Object.entries(payload.results.errors).map(([k, v]) => `${k}: ${v}`).join(' / ')
      : null,
  });
}

/**
 * PATCH /api/v1/scheduled-posts/[id]
 * 予約日時の変更。body: { "scheduledAt": "ISO8601" }
 * 未消化（status='scheduled' かつ未 claim）の予約のみ変更可。
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = verifyThothApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  let body: { scheduledAt?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'リクエストボディが JSON として解釈できません' }, { status: 400 });
  }
  const rawScheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt : '';
  const scheduledAt = new Date(rawScheduledAt);
  if (!rawScheduledAt || isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'scheduledAt は ISO8601 形式で指定してください' }, { status: 422 });
  }
  if (scheduledAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'scheduledAt が過去日時です' }, { status: 422 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any;

  // 未消化行のみ原子的に更新（claim 済み = 配信処理中は変更不可）
  const { data: updated, error } = await admin
    .from('scheduled_posts')
    .update({ scheduled_at: scheduledAt.toISOString() })
    .eq('id', id)
    .eq('payload->partner->>source', 'thoth')
    .eq('status', 'scheduled')
    .is('locked_at', null)
    .select('id, status, scheduled_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!Array.isArray(updated) || updated.length === 0) {
    const { data: post } = await fetchThothPost(admin, id);
    if (!post) return NextResponse.json({ error: '対象の予約が見つかりません' }, { status: 404 });
    return NextResponse.json(
      { error: `変更できない状態です（status: ${post.status}${post.locked_at ? '・配信処理中' : ''}）` },
      { status: 409 },
    );
  }

  return NextResponse.json({
    expressoPostId: updated[0].id,
    status: updated[0].status,
    scheduledAt: updated[0].scheduled_at,
  });
}

/**
 * DELETE /api/v1/scheduled-posts/[id]
 * 予約キャンセル。行は監査用に残し status='cancelled' へ変更、取り込み済み画像は削除する。
 * 未消化（status='scheduled' かつ未 claim）の予約のみキャンセル可。
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = verifyThothApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any;

  // 未消化行のみ原子的にキャンセル（claim 済み = 配信処理中は不可 → 二重投稿防止と同じ原則）
  const { data: cancelled, error } = await admin
    .from('scheduled_posts')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('payload->partner->>source', 'thoth')
    .eq('status', 'scheduled')
    .is('locked_at', null)
    .select('id, payload');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!Array.isArray(cancelled) || cancelled.length === 0) {
    const { data: post } = await fetchThothPost(admin, id);
    if (!post) return NextResponse.json({ error: '対象の予約が見つかりません' }, { status: 404 });
    return NextResponse.json(
      { error: `キャンセルできない状態です（status: ${post.status}${post.locked_at ? '・配信処理中' : ''}）` },
      { status: 409 },
    );
  }

  // 取り込み済み画像のクリーンアップ（best-effort）
  const payload = cancelled[0].payload;
  if (isPayloadV1(payload)) {
    const paths = collectImagePaths(payload);
    if (paths.length > 0) await deletePostImages(paths);
  }

  return NextResponse.json({ expressoPostId: id, status: 'cancelled' });
}
