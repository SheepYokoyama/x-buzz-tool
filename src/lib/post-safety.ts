/**
 * 投稿の構造的セーフティ（BAN 回避の最優先要件）
 *
 * 自動投稿ツールは「同一文面の連投」「1 アカウントの過剰投稿」で shadowban / 凍結に直結し、
 * アカウント・履歴・トークン・API クォータという資産を一括で失う。
 * スケジューラのバグ（重複実行・タイムアウト等）が起きても、投稿層そのものが
 * 危険な投稿を拒否する多層防御をここに集約する。
 *
 * 防御線:
 *   1. claim（cron 側）        … 同じ予約行を二度拾わない（再投稿の主因を断つ）
 *   2. 冪等ガード isAlreadyPublished … 既に成功結果を持つ行は二度と投稿しない
 *   3. 24h レートバックストップ assertWithinDailyCap … 1 アカウントの過剰投稿を物理的に止める
 *
 * 参考: BAN 回避ガイドライン（公式 API + OAuth + X 100 投稿/日・Threads 250/24h で
 *       shadowban 対象外）。ここでは安全側に倒して既定値をやや低めに設定する。
 */
import { getSupabaseAdmin } from '@/lib/supabase';
import type {
  ScheduledPostPayloadV1,
  ScheduledPlatform,
} from '@/lib/scheduled-post-payload';

/**
 * 1 アカウントあたり直近 24 時間の投稿上限（構造的バックストップ）。
 * ガイドラインの shadowban 安全圏よりさらに低めに設定し、env で調整可能にする。
 */
export const DAILY_POST_CAP: Record<ScheduledPlatform, number> = {
  x:         Number(process.env.SAFETY_DAILY_CAP_X         ?? 90),
  threads:   Number(process.env.SAFETY_DAILY_CAP_THREADS   ?? 200),
  instagram: Number(process.env.SAFETY_DAILY_CAP_INSTAGRAM ?? 40),
};

/**
 * 冪等ガード: payload.results に成功投稿が 1 件でも記録されていれば「投稿済み」とみなす。
 * claim とは独立した第 2 の防御線。何らかの理由で投稿済みの行が再処理されても、
 * ここで弾いて二重投稿を防ぐ。
 */
export function isAlreadyPublished(payload: unknown): boolean {
  const r = (payload as ScheduledPostPayloadV1 | null | undefined)?.results;
  if (!r) return false;
  return (r.x?.length ?? 0) > 0
      || (r.threads?.length ?? 0) > 0
      || (r.instagram?.length ?? 0) > 0;
}

/**
 * 指定ユーザー・プラットフォームの直近 24 時間の実投稿数を集計する。
 * scheduled_posts の published 行の results[platform] 件数を合算（スレッドは複数件）。
 *
 * 集計に失敗した場合は -1 を返す（呼び出し側で「不明」と扱う）。
 */
export async function countRecentPosts(
  userId: string,
  platform: ScheduledPlatform,
): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_posts')
    .select('payload')
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', since);

  if (error || !Array.isArray(data)) {
    console.error('[post-safety] countRecentPosts failed:', error?.message);
    return -1;
  }

  let total = 0;
  for (const row of data) {
    const items = (row.payload as ScheduledPostPayloadV1 | null)?.results?.[platform];
    total += Array.isArray(items) ? items.length : 0;
  }
  return total;
}

export interface DailyCapCheck {
  ok: boolean;
  /** 直近 24h の投稿数（不明な場合は null）*/
  recent: number | null;
  cap: number;
  error?: string;
}

/**
 * 投稿前チェック: これから addCount 件投稿すると 24h 上限を超えないかを判定する。
 * 超過する場合 ok=false を返し、呼び出し側はそのプラットフォームへの投稿を見送る。
 *
 * 集計不能（DB エラー）時は ok=true（バックストップを無効化）にして全体停止を避ける。
 * 主防御は claim + 冪等ガードであり、本チェックはあくまで過剰投稿の最終ブレーキ。
 */
export async function checkDailyCap(
  userId: string,
  platform: ScheduledPlatform,
  addCount: number,
): Promise<DailyCapCheck> {
  const cap = DAILY_POST_CAP[platform];
  const recent = await countRecentPosts(userId, platform);
  if (recent < 0) {
    // 集計失敗 → 安全に倒しつつも全停止は避ける（許可するが警告ログ）
    console.warn(`[post-safety] daily-cap check skipped for ${platform} (count unavailable)`);
    return { ok: true, recent: null, cap };
  }
  if (recent + addCount > cap) {
    return {
      ok: false,
      recent,
      cap,
      error: `安全上限に達したため投稿を見送りました（直近24時間 ${recent} 件 + 今回 ${addCount} 件 > 上限 ${cap} 件 / ${platform}）`,
    };
  }
  return { ok: true, recent, cap };
}
