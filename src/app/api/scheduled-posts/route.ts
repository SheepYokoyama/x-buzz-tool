import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveXAccountId } from '@/lib/x-client';
import { getActiveThreadsAccountId } from '@/lib/threads-client';
import { getActiveInstagramAccountId } from '@/lib/instagram-client';
import { uploadPostImage, deletePostImages } from '@/lib/post-storage';
import type {
  ScheduledMode,
  ScheduledPlatform,
  ScheduledPostPayloadV1,
  ScheduledChunk,
} from '@/lib/scheduled-post-payload';

const MAX_IMAGES_PER_POST = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const VALID_MODES: ReadonlySet<ScheduledMode> = new Set(['thread', 'separate', 'none'] as const);
const VALID_PLATFORMS: ReadonlySet<ScheduledPlatform> = new Set(['x', 'threads', 'instagram'] as const);

/**
 * POST /api/scheduled-posts
 * ポスト作成画面からの予約投稿を受け付ける。
 *
 * Content-Type: multipart/form-data
 *   - texts:        JSON 文字列化した string[]      （必須・各 chunk のテキスト）
 *   - mode:         'thread' | 'separate' | 'none'  （必須）
 *   - platforms:    JSON 文字列化した ('x'|'threads')[]（必須・最低1つ）
 *   - numbering:    'true' | 'false'                （任意・既定 false）
 *   - scheduled_at: ISO8601 文字列                  （必須・未来日時）
 *   - tags:         JSON 文字列化した string[]      （任意）
 *   - images_${i}:  File[]                          （i 件目に添付。各 chunk 最大4枚）
 *
 * 流れ:
 *   1. 各画像を post-uploads バケットにアップロードして public URL を取得
 *   2. payload(version=1) を組み立てて scheduled_posts に INSERT
 *      content は互換用に各 chunk テキストを `\n\n${MANUAL_SPLIT_MARKER}\n\n` で結合した本文を入れる
 *      （旧UI/旧cronから見ても破綻しない形）
 *   3. プラットフォームに応じて x_account_id を埋める（Threads単独なら Threads アカウントID）
 *   4. 失敗時はアップロード済み画像を巻き戻す
 */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Content-Type は multipart/form-data 必須です' }, { status: 400 });
  }

  const form = await req.formData();

  // ── texts ─────────────────────────────────────
  let texts: string[] = [];
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
  if (texts.length === 0) {
    return NextResponse.json({ error: '投稿テキストが空です' }, { status: 400 });
  }

  // ── mode ──────────────────────────────────────
  const rawMode = form.get('mode');
  const mode: ScheduledMode =
    typeof rawMode === 'string' && VALID_MODES.has(rawMode as ScheduledMode)
      ? (rawMode as ScheduledMode)
      : 'thread';

  // ── platforms ─────────────────────────────────
  let platforms: ScheduledPlatform[] = [];
  const rawPlatforms = form.get('platforms');
  if (typeof rawPlatforms === 'string') {
    try {
      const parsed = JSON.parse(rawPlatforms);
      if (Array.isArray(parsed)) {
        platforms = parsed.filter((p): p is ScheduledPlatform =>
          typeof p === 'string' && VALID_PLATFORMS.has(p as ScheduledPlatform),
        );
      }
    } catch {
      return NextResponse.json({ error: 'platforms のパースに失敗しました' }, { status: 400 });
    }
  }
  if (platforms.length === 0) {
    return NextResponse.json({ error: '投稿先プラットフォームを最低1つ指定してください' }, { status: 400 });
  }

  // ── numbering ─────────────────────────────────
  const numbering = form.get('numbering') === 'true';

  // ── scheduled_at ──────────────────────────────
  const rawScheduled = form.get('scheduled_at');
  if (typeof rawScheduled !== 'string' || !rawScheduled) {
    return NextResponse.json({ error: 'scheduled_at が必要です' }, { status: 400 });
  }
  const scheduledAt = new Date(rawScheduled);
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'scheduled_at の形式が不正です' }, { status: 400 });
  }

  // ── tags ──────────────────────────────────────
  let tags: string[] = [];
  const rawTags = form.get('tags');
  if (typeof rawTags === 'string' && rawTags) {
    try {
      const parsed = JSON.parse(rawTags);
      if (Array.isArray(parsed)) {
        tags = parsed
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean);
      }
    } catch {
      return NextResponse.json({ error: 'tags のパースに失敗しました' }, { status: 400 });
    }
  }

  // ── images_${i} 集計＆バリデーション ─────────
  const chunkFiles: File[][] = [];
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
    chunkFiles.push(files);
  }

  // ── Instagram は画像必須（全chunk合計で1枚以上）──
  if (platforms.includes('instagram')) {
    const totalImages = chunkFiles.reduce((sum, files) => sum + files.length, 0);
    if (totalImages === 0) {
      return NextResponse.json(
        { error: 'Instagram への予約投稿には画像が1枚以上必要です' },
        { status: 400 },
      );
    }
  }

  // ── 画像アップロード（失敗時は巻き戻し）──────
  const chunks: ScheduledChunk[] = texts.map((t) => ({ text: t, images: [] }));
  const allUploadedPaths: string[] = [];
  try {
    for (let i = 0; i < chunkFiles.length; i++) {
      const files = chunkFiles[i];
      if (files.length === 0) continue;
      const uploaded = await Promise.all(
        files.map((file) => uploadPostImage({ userId: user.id, file })),
      );
      chunks[i].images = uploaded;
      for (const u of uploaded) allUploadedPaths.push(u.path);
    }
  } catch (err: unknown) {
    if (allUploadedPaths.length > 0) await deletePostImages(allUploadedPaths);
    const msg = err instanceof Error ? err.message : '画像アップロードに失敗しました';
    return NextResponse.json({ error: `画像アップロード失敗: ${msg}` }, { status: 502 });
  }

  // ── payload 組立 ──────────────────────────────
  const payload: ScheduledPostPayloadV1 = {
    version: 1,
    mode,
    platforms,
    numbering,
    chunks,
  };

  // ── content（旧仕様互換）と x_account_id ──────
  // content には全 chunk テキストを 2 行空けて連結（旧UIで開いても可読）。
  const legacyContent = texts.join('\n\n---\n\n');

  // x_account_id 列は代表アカウントの UUID を記録する（X 優先、次に Threads、最後に Instagram）。
  const accountId = platforms.includes('x')
    ? await getActiveXAccountId(user.id)
    : platforms.includes('threads')
      ? await getActiveThreadsAccountId(user.id)
      : await getActiveInstagramAccountId(user.id);

  // ── DB INSERT ─────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any;
  const { data, error } = await admin
    .from('scheduled_posts')
    .insert({
      content:      legacyContent,
      scheduled_at: scheduledAt.toISOString(),
      tags,
      status:       'scheduled',
      user_id:      user.id,
      x_account_id: accountId,
      payload,
    })
    .select()
    .single();

  if (error || !data) {
    // DB 失敗時はアップロード済み画像を巻き戻し
    if (allUploadedPaths.length > 0) await deletePostImages(allUploadedPaths);
    return NextResponse.json(
      { error: error?.message ?? '予約投稿の保存に失敗しました' },
      { status: 500 },
    );
  }

  return NextResponse.json({ post: data });
}
