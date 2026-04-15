import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveXClient } from '@/lib/x-client';
import {
  buildSearchQuery,
  calcFfRatio,
  extractMatchedKeywords,
  filterCandidate,
  type XUserV2,
  type XTweetV2,
} from '@/lib/follow-hunt';
import type { FollowHuntSettings, PostPersona } from '@/lib/types';

/** デフォルト設定を作成するためのオブジェクト */
const DEFAULT_SETTINGS: Omit<FollowHuntSettings, 'user_id' | 'updated_at'> = {
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
 * POST /api/follow-hunt/discover
 * アクティブペルソナのキーワードで X を検索し、フィルタを通過したユーザーを follow_candidates に登録する。
 */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  // body からキーワードを受け取る（任意）
  // - keywords: クライアントが最終決定したキーワード配列（除外反映済）。あればこれを正として使う
  // - extra_keywords: 後方互換・ペルソナ keywords に追加するフリーキーワード
  const body = await req.json().catch(() => ({}));
  const parseKeywords = (src: unknown): string[] =>
    Array.isArray(src)
      ? (src as unknown[])
          .filter((v): v is string => typeof v === 'string')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];
  const clientKeywords = parseKeywords(body.keywords);
  const extraKeywords  = parseKeywords(body.extra_keywords);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseAdmin() as any;

  // アクティブペルソナ取得
  const { data: persona } = await sb
    .from('post_personas')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!persona) {
    return NextResponse.json(
      { error: 'アクティブなペルソナがありません。先にペルソナを設定してください。' },
      { status: 400 }
    );
  }

  const typedPersona = persona as PostPersona;
  const personaKeywords = typedPersona.keywords ?? [];

  // クライアントが keywords を指定してきた場合はそれを信頼（除外済みを反映した結果）。
  // それ以外はペルソナ keywords + extra_keywords をマージ（従来動作）。
  const keywords = clientKeywords.length > 0
    ? Array.from(new Set(clientKeywords))
    : Array.from(new Set([...personaKeywords, ...extraKeywords]));

  if (keywords.length === 0) {
    return NextResponse.json(
      { error: 'キーワードが1つもありません。ペルソナ設定か追加キーワードを入力してください。' },
      { status: 400 }
    );
  }

  // 設定取得（無ければデフォルトで作成）
  let { data: settings } = await sb
    .from('follow_hunt_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!settings) {
    const { data: inserted } = await sb
      .from('follow_hunt_settings')
      .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
      .select()
      .single();
    settings = inserted;
  }

  const typedSettings = settings as FollowHuntSettings;

  // X クライアント取得
  const client = await getActiveXClient(user.id);
  if (!client) {
    return NextResponse.json(
      { error: 'X アカウントが未連携です。' },
      { status: 400 }
    );
  }

  // 検索クエリ組み立て
  const query = buildSearchQuery(keywords);
  if (!query) {
    return NextResponse.json(
      { error: 'キーワードが検索に使える形式ではありません（2〜40文字を1件以上）' },
      { status: 400 }
    );
  }

  // 自分の X user id（既フォローチェック用）
  let myXUserId: string | null = null;
  try {
    const { data: me } = await client.v2.me();
    myXUserId = me.id;
  } catch {
    // me 取れなくても続行（自分自身除外ができないだけ）
  }

  // 既存の候補 x_user_id（全ステータス）を取得してスキップ判定
  const { data: existing } = await sb
    .from('follow_candidates')
    .select('x_user_id')
    .eq('user_id', user.id);
  const existingIds = new Set<string>(
    (existing ?? []).map((r: { x_user_id: string }) => r.x_user_id)
  );

  // X recent search 実行（expansions で authors 同時取得 - 追加 API コールを削減）
  let searchResult;
  try {
    searchResult = await client.v2.search(query, {
      max_results: typedSettings.max_results,
      expansions: ['author_id'],
      'tweet.fields': ['author_id', 'created_at'],
      'user.fields': ['public_metrics', 'description', 'profile_image_url', 'created_at'],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'X 検索に失敗しました';
    console.error('follow-hunt search error:', err);
    return NextResponse.json({ error: `X 検索に失敗しました: ${msg}` }, { status: 500 });
  }

  const tweets: XTweetV2[] = (searchResult.data?.data ?? []) as XTweetV2[];
  const includesUsers: XUserV2[] = (searchResult.data?.includes?.users ?? []) as XUserV2[];

  if (tweets.length === 0) {
    return NextResponse.json({
      inserted: 0,
      candidates: [],
      message: 'ヒットがありませんでした。キーワードを見直してください。',
    });
  }

  // author_id -> tweet を紐付け（sample_tweet 用に最新のものを保持）
  const authorToTweet = new Map<string, XTweetV2>();
  for (const t of tweets) {
    if (!authorToTweet.has(t.author_id)) authorToTweet.set(t.author_id, t);
  }

  // 各 author をフィルタリングして insert 用レコードを組み立て
  const records: Array<Omit<import('@/lib/types').FollowCandidate, 'id' | 'status' | 'created_at' | 'followed_at'> & { status: 'pending' }> = [];

  for (const xUser of includesUsers) {
    // 自分自身除外
    if (myXUserId && xUser.id === myXUserId) continue;
    // 既存候補除外
    if (existingIds.has(xUser.id)) continue;

    const check = filterCandidate(xUser, typedSettings);
    if (!check.ok) continue;

    const tweet = authorToTweet.get(xUser.id);
    const bio = xUser.description ?? '';
    const sample = tweet?.text ?? '';
    const matched = extractMatchedKeywords(keywords, bio, sample);
    if (matched.length === 0) continue; // キーワードがどちらにも含まれない = 誤ヒット

    const metrics = xUser.public_metrics!;
    records.push({
      user_id: user.id,
      persona_id: typedPersona.id,
      x_user_id: xUser.id,
      username: xUser.username,
      display_name: xUser.name ?? null,
      bio,
      profile_image_url: xUser.profile_image_url ?? null,
      followers_count: metrics.followers_count,
      following_count: metrics.following_count,
      ff_ratio: calcFfRatio(metrics.followers_count, metrics.following_count),
      last_tweeted_at: tweet?.created_at ?? null,
      matched_keywords: matched,
      sample_tweet_text: sample || null,
      status: 'pending',
    });
  }

  if (records.length === 0) {
    return NextResponse.json({
      inserted: 0,
      candidates: [],
      message: '条件に合うユーザーが見つかりませんでした。設定を緩めて再試行してください。',
    });
  }

  const { data: insertedCandidates, error: insertErr } = await sb
    .from('follow_candidates')
    .upsert(records, { onConflict: 'user_id,x_user_id', ignoreDuplicates: true })
    .select();

  if (insertErr) {
    console.error('follow-hunt insert error:', insertErr);
    return NextResponse.json(
      { error: `候補の登録に失敗しました: ${insertErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    inserted: insertedCandidates?.length ?? 0,
    candidates: insertedCandidates ?? [],
    searched_tweets: tweets.length,
  });
}
