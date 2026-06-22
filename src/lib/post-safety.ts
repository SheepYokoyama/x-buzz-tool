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
 * 完了判定ガード: 対象の全プラットフォームで全チャンクが投稿済みかを判定する。
 * resume（部分投稿の持ち越し）と両立させるため「1件でもあれば済み」ではなく
 * 「全部投稿し終えたか」で見る。完了済みの行が再処理されても二重投稿しないための第2防御線。
 *
 * 部分投稿（まだ続きがある）行はここで false を返し、resume で続きを投稿させる。
 */
export function isFullyPublished(payload: ScheduledPostPayloadV1): boolean {
  const r = payload.results;
  if (!r) return false;
  const total = payload.chunks.length;
  if (total === 0) return false;
  for (const platform of payload.platforms) {
    if (platform === 'instagram') {
      if ((r.instagram?.length ?? 0) < 1) return false;
    } else {
      if ((r[platform]?.length ?? 0) < total) return false;
    }
  }
  return true;
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

// ─────────────────────────────────────────────────────────────
// 即時投稿エンドポイント（/api/x/*, /api/threads/thread, /api/instagram/post）向けガード
//
// cron と異なり「サーバー側の繰り返し実行」は無いが、ダブルクリック・クライアント再送・
// スレッド途中失敗後の再試行で重複投稿が起きうる。特に Threads/Instagram(Meta) は
// 同一文面でも重複を弾かないため、ツール側で防ぐ必要がある。
// ─────────────────────────────────────────────────────────────

/** 即時投稿の二重送信判定ウィンドウ（分）。この時間内の同一文面は重複とみなす。 */
const RECENT_DUP_WINDOW_MIN = Number(process.env.SAFETY_DUP_WINDOW_MIN ?? 10);
/** ユーザー単位の 24h 総投稿数バックストップ（即時投稿の暴走ブレーキ）。 */
const TOTAL_DAILY_CAP = Number(process.env.SAFETY_DAILY_TOTAL_CAP ?? 300);

/**
 * 直近 RECENT_DUP_WINDOW_MIN 分以内に同一ユーザーが同一 content を投稿済みかを判定する。
 * 二重送信（ダブルクリック/リトライ）による重複投稿の検知用。判定不能時は false（許可）。
 */
export async function isRecentDuplicate(userId: string, content: string): Promise<boolean> {
  const text = content.trim();
  if (!text) return false;
  const since = new Date(Date.now() - RECENT_DUP_WINDOW_MIN * 60_000).toISOString();
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_posts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'published')
    .eq('content', text)
    .gte('published_at', since)
    .limit(1);
  if (error || !Array.isArray(data)) {
    console.error('[post-safety] isRecentDuplicate failed:', error?.message);
    return false;
  }
  return data.length > 0;
}

/**
 * ユーザーが直近 24h に投稿(published)した行数。即時投稿の暴走ブレーキ用。
 * プラットフォーム横断のユーザー総量（粗い歯止め）。判定不能時は -1。
 */
export async function countRecentPublishedRows(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from('scheduled_posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', since);
  if (error) {
    console.error('[post-safety] countRecentPublishedRows failed:', error.message);
    return -1;
  }
  return count ?? 0;
}

export interface ImmediateGuardResult {
  ok: boolean;
  status: number;
  error?: string;
}

/**
 * 即時投稿エンドポイント共通の事前セーフティ。
 *   ① 直近同一文面の二重投稿を拒否（409）
 *   ② 24h 総投稿数のボリュームバックストップ（429）
 * content は代表テキスト（スレッドなら先頭ポスト、IG はキャプション）を渡す。
 */
export async function guardImmediatePost(
  userId: string,
  content: string,
): Promise<ImmediateGuardResult> {
  if (await isRecentDuplicate(userId, content)) {
    return {
      ok: false,
      status: 409,
      error: '直前に同じ内容を投稿済みです。重複投稿を防ぐためブロックしました（数分後なら再試行できます）。',
    };
  }
  const recent = await countRecentPublishedRows(userId);
  if (recent >= 0 && recent >= TOTAL_DAILY_CAP) {
    return {
      ok: false,
      status: 429,
      error: `24時間の投稿上限（${TOTAL_DAILY_CAP}件）に達しました。安全のため一時的に投稿を制限しています。`,
    };
  }
  return { ok: true, status: 200 };
}
