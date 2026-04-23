import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveXClient } from '@/lib/x-client';
import type { FollowCandidate, FollowHuntSettings } from '@/lib/types';

/** いいね→フォロー間のディレイ（ミリ秒）。スパム検知を回避するためランダム化。 */
const LIKE_FOLLOW_DELAY_MIN_MS = 5000;
const LIKE_FOLLOW_DELAY_MAX_MS = 15000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () =>
  LIKE_FOLLOW_DELAY_MIN_MS +
  Math.floor(Math.random() * (LIKE_FOLLOW_DELAY_MAX_MS - LIKE_FOLLOW_DELAY_MIN_MS));

/** twitter-api-v2 の 402 (CreditsDepleted) エラーかを判定 */
function isCreditsDepleted(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: number; data?: { title?: string; type?: string } };
  if (e.code !== 402) return false;
  const title = e.data?.title ?? '';
  const type = e.data?.type ?? '';
  return title === 'CreditsDepleted' || type.includes('/problems/credits');
}

const CREDITS_DEPLETED_MESSAGE =
  'X API のクレジットが不足しています。X Developer Portal で残高を確認するか、カードの「外部リンク」から X で直接操作してください。';

/**
 * PATCH /api/follow-hunt/candidates/[id]
 * body: { action: 'follow' | 'like_and_follow' | 'skip' }
 *
 * follow:          X でフォロー → status='followed' 更新
 * like_and_follow: 直近ツイートにいいね → ディレイ → フォロー
 * skip:            status='skipped' 更新のみ
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as 'follow' | 'like_and_follow' | 'skip' | undefined;

  if (action !== 'follow' && action !== 'like_and_follow' && action !== 'skip') {
    return NextResponse.json(
      { error: "action は 'follow' / 'like_and_follow' / 'skip' のいずれかを指定してください" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabaseAdmin() as any;

  // 候補取得（自分のものか確認）
  const { data: candidate } = await sb
    .from('follow_candidates')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: '候補が見つかりません' }, { status: 404 });
  }

  const typedCandidate = candidate as FollowCandidate;

  if (typedCandidate.status !== 'pending') {
    return NextResponse.json(
      { error: 'この候補は既に処理済みです' },
      { status: 400 }
    );
  }

  // ─── skip ───────────────────────────────
  if (action === 'skip') {
    const { error } = await sb
      .from('follow_candidates')
      .update({ status: 'skipped' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: 'スキップに失敗しました' }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'skipped' });
  }

  // ─── follow / like_and_follow ─────────────
  // 日次上限チェック
  const { data: settings } = await sb
    .from('follow_hunt_settings')
    .select('daily_follow_cap')
    .eq('user_id', user.id)
    .single();

  const cap = (settings as Pick<FollowHuntSettings, 'daily_follow_cap'> | null)?.daily_follow_cap ?? 20;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { count: followedToday } = await sb
    .from('follow_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'followed')
    .gte('followed_at', startOfToday.toISOString());

  if ((followedToday ?? 0) >= cap) {
    return NextResponse.json(
      { error: `本日のフォロー上限 (${cap}件) に達しました` },
      { status: 429 }
    );
  }

  // like_and_follow なのに sample_tweet_id が無い場合はエラー（UI 側で出さない想定）
  if (action === 'like_and_follow' && !typedCandidate.sample_tweet_id) {
    return NextResponse.json(
      { error: 'いいね対象のツイートが記録されていません。フォローのみを実行してください。' },
      { status: 400 }
    );
  }

  // X クライアント取得
  const client = await getActiveXClient(user.id);
  if (!client) {
    return NextResponse.json({ error: 'X アカウントが未連携です' }, { status: 400 });
  }

  // 自分の X user id 取得
  let myXUserId: string;
  try {
    const { data: me } = await client.v2.me();
    myXUserId = me.id;
  } catch (err) {
    console.error('follow: v2.me error:', err);
    return NextResponse.json(
      { error: 'X ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }

  // いいね実行（like_and_follow の場合のみ。失敗してもフォローは続行）
  // ただしクレジット枯渇 (402) の場合はフォローも失敗確実なのでこの時点で打ち切る
  let likeStatus: 'liked' | 'like_failed' | 'skipped' = 'skipped';
  let likeError: string | null = null;
  if (action === 'like_and_follow' && typedCandidate.sample_tweet_id) {
    try {
      await client.v2.like(myXUserId, typedCandidate.sample_tweet_id);
      likeStatus = 'liked';
    } catch (err) {
      likeStatus = 'like_failed';
      likeError = err instanceof Error ? err.message : 'unknown';
      console.warn('like_and_follow: v2.like failed (続行):', likeError);

      if (isCreditsDepleted(err)) {
        await sb.from('follow_candidates').update({ status: 'failed' }).eq('id', id);
        return NextResponse.json(
          {
            error: CREDITS_DEPLETED_MESSAGE,
            reason: 'credits_depleted',
            like_status: likeStatus,
            like_error: likeError,
          },
          { status: 402 }
        );
      }
    }

    // いいね→フォロー間のディレイ（5〜15秒のランダム）
    await sleep(randomDelay());
  }

  // フォロー実行
  try {
    await client.v2.follow(myXUserId, typedCandidate.x_user_id);
  } catch (err) {
    console.error('follow: v2.follow error:', err);
    await sb.from('follow_candidates').update({ status: 'failed' }).eq('id', id);

    if (isCreditsDepleted(err)) {
      return NextResponse.json(
        {
          error: CREDITS_DEPLETED_MESSAGE,
          reason: 'credits_depleted',
          like_status: likeStatus,
          like_error: likeError,
        },
        { status: 402 }
      );
    }

    const msg = err instanceof Error ? err.message : 'X フォローに失敗しました';
    return NextResponse.json(
      { error: `フォローに失敗しました: ${msg}`, like_status: likeStatus, like_error: likeError },
      { status: 500 }
    );
  }

  // ステータス更新
  const { error: updateErr } = await sb
    .from('follow_candidates')
    .update({ status: 'followed', followed_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) {
    console.error('follow: update error:', updateErr);
    // フォロー自体は成功しているので警告扱い
  }

  return NextResponse.json({
    ok: true,
    status: 'followed',
    like_status: likeStatus,
    like_error: likeError,
  });
}
