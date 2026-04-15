import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

const DEFAULT_SETTINGS = {
  banned_words: [
    '副業', 'アフィリエイト', '稼ぐ', '売上',
    'bot', '相互', 'フォロバ', 'フォロバック',
    '暗号', 'NFT', 'シグナル', '利益確定',
    '出会い', 'えっち',
  ],
  min_ff_ratio: 1.0,
  max_ff_ratio: 1.5,
  min_followers: 100,
  max_followers: 5000,
  active_days: 30,
  daily_follow_cap: 20,
  max_results: 20,
};

/**
 * GET /api/follow-hunt/settings
 * 無ければデフォルト値で作成して返す
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseAdmin() as any;

  const { data } = await sb
    .from('follow_hunt_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (data) return NextResponse.json({ settings: data });

  // 無ければ作成
  const { data: inserted, error } = await sb
    .from('follow_hunt_settings')
    .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
    .select()
    .single();

  if (error) {
    console.error('GET /api/follow-hunt/settings error:', error);
    return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ settings: inserted });
}

/**
 * PATCH /api/follow-hunt/settings
 * body: 設定の部分更新
 */
export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};

  // ホワイトリストで受け入れるフィールドのみ更新
  const allowedFields = [
    'banned_words',
    'min_ff_ratio',
    'max_ff_ratio',
    'min_followers',
    'max_followers',
    'active_days',
    'daily_follow_cap',
    'max_results',
  ] as const;

  for (const k of allowedFields) {
    if (body[k] !== undefined) patch[k] = body[k];
  }

  // バリデーション
  if (typeof patch.max_results === 'number' && (patch.max_results < 10 || patch.max_results > 100)) {
    return NextResponse.json({ error: 'max_results は 10〜100 の範囲で指定してください' }, { status: 400 });
  }

  if (Array.isArray(patch.banned_words)) {
    patch.banned_words = (patch.banned_words as unknown[])
      .filter((v): v is string => typeof v === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 50);
  }

  patch.updated_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseAdmin() as any;

  const { data, error } = await sb
    .from('follow_hunt_settings')
    .upsert({ user_id: user.id, ...DEFAULT_SETTINGS, ...patch }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('PATCH /api/follow-hunt/settings error:', error);
    return NextResponse.json({ error: '設定の更新に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
