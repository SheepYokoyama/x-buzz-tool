/**
 * Thoth 連携（外部パートナー受け入れ）共通ライブラリ
 *
 * 「Thoth × Expresso 連携仕様書 v1.0」（2026-07-11 受領）に基づく Phase 1 実装:
 *   ① 予約登録 POST /api/v1/scheduled-posts（Bearer APIキー認証・thothPostId 冪等）
 *   ② 状態通知 Webhook → Thoth（HMAC-SHA256 署名・post.scheduled/posted/failed）
 * ③ 実績通知（metrics 1h/24h/72h/7d）は Phase 2（未実装）。
 *
 * 環境変数（すべて未設定なら本機能は完全に無効 = 既存動作への影響ゼロ）:
 *   THOTH_API_KEY        … Thoth→Xpresso の受け入れ認証キー（未設定なら受け入れAPIは503）
 *   THOTH_WEBHOOK_URL    … Xpresso→Thoth の Webhook 送信先
 *   THOTH_WEBHOOK_SECRET … Webhook の HMAC-SHA256 共有シークレット
 *
 * キー生成は CLAUDE.md のルールに従い hex 文字列限定:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
import { createHash, createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ScheduledImage } from '@/lib/scheduled-post-payload';

// ─────────────────────────────────────────────
// 認証（Thoth → Xpresso）
// ─────────────────────────────────────────────

export type PartnerAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/** 文字列を SHA-256 ハッシュ経由でタイミングセーフ比較する（長さ漏洩防止）。 */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * 受け入れ API の Bearer APIキー認証。
 * THOTH_API_KEY 未設定時は 503（機能無効）を返し、既存環境では何も起きない。
 */
export function verifyThothApiKey(req: Request): PartnerAuthResult {
  const configured = process.env.THOTH_API_KEY;
  if (!configured) {
    return { ok: false, status: 503, error: '外部連携は現在無効です（サーバー側でキーが未設定）' };
  }
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  if (!token || !safeEqual(token, configured)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────
// 会員突合（memberEmail → Supabase Auth ユーザー）
// ─────────────────────────────────────────────

const MEMBER_LOOKUP_MAX_PAGES = 10;
const MEMBER_LOOKUP_PER_PAGE = 200;

/**
 * メールアドレスから Supabase Auth ユーザーを逆引きする。
 * 会員は両アプリ共通の Google アカウント（メール）で紐付ける前提（仕様書 §0）。
 * 見つからなければ null。照会失敗（ネットワーク等）は例外を投げる。
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;
  const admin = getSupabaseAdmin();
  for (let page = 1; page <= MEMBER_LOOKUP_MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: MEMBER_LOOKUP_PER_PAGE,
    });
    if (error) throw new Error(`会員照会に失敗しました: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < MEMBER_LOOKUP_PER_PAGE) break;
  }
  return null;
}

// ─────────────────────────────────────────────
// 状態通知 Webhook（Xpresso → Thoth）
// ─────────────────────────────────────────────

export interface ThothWebhookEvent {
  event: 'post.scheduled' | 'post.posted' | 'post.failed';
  thothPostId: string;
  expressoPostId: string;
  /** posted 時のみ。X 投稿の代表 postId */
  xPostId?: string | null;
  /** posted 時のみ。Threads 投稿の代表 postId */
  threadsPostId?: string | null;
  postedAt?: string | null;
  postUrl?: string | null;
  /** failed 時のみ（コード＋メッセージ相当の文字列） */
  error?: string | null;
  /** 署名検証・リプレイ防止用（Thoth 側で ±5 分検証） */
  timestamp: string;
}

const WEBHOOK_TIMEOUT_MS = Number(process.env.THOTH_WEBHOOK_TIMEOUT_MS ?? 5_000);

/**
 * Thoth へ状態通知 Webhook を送信する。
 * - body を HMAC-SHA256 署名し `X-Expresso-Signature: sha256=<hex>` を付与（仕様書 §1）
 * - 5xx / ネットワークエラー時は attempts 回まで指数バックオフで再送
 * - 4xx は再送しない（ペイロード起因のため）
 * - **絶対に例外を投げない**（投稿フロー本体を止めないため。失敗はログのみ）
 * - THOTH_WEBHOOK_URL / SECRET 未設定時は何もしない（機能無効）
 *
 * @returns 送達できたら true（未設定スキップ・失敗は false）
 */
export async function sendThothWebhook(
  event: Omit<ThothWebhookEvent, 'timestamp'>,
  options?: { attempts?: number },
): Promise<boolean> {
  const url = process.env.THOTH_WEBHOOK_URL;
  const secret = process.env.THOTH_WEBHOOK_SECRET;
  if (!url || !secret) return false;

  const attempts = Math.max(1, options?.attempts ?? 3);
  const body = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Expresso-Signature': `sha256=${signature}`,
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) return true;
      if (res.status < 500) {
        console.error(`[thoth-webhook] ${event.event} rejected (${res.status}) — 再送しません`);
        return false;
      }
      console.warn(`[thoth-webhook] ${event.event} got ${res.status} (attempt ${i + 1}/${attempts})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[thoth-webhook] ${event.event} send error (attempt ${i + 1}/${attempts}): ${msg}`);
    }
    // 指数バックオフ（1s, 2s, 4s, ...）。最終試行後は待たない。
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 1_000 * 2 ** i));
    }
  }
  console.error(`[thoth-webhook] ${event.event} 送達失敗（thothPostId=${event.thothPostId}）`);
  return false;
}

// ─────────────────────────────────────────────
// メディア取り込み（mediaUrls → post-uploads バケット）
// ─────────────────────────────────────────────

const MEDIA_FETCH_TIMEOUT_MS = 10_000;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 既存の予約投稿と同じ 5MB 上限
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * Thoth から渡された公開 URL の画像を post-uploads バケットへ取り込む。
 * 配信時刻まで Thoth 側ホスティングに依存しないよう、登録時点で自前ストレージへ複製する。
 * v1 は画像のみ対応（動画は 422 で拒否する想定。呼び出し側でメッセージ化）。
 *
 * 失敗時は例外を投げる（呼び出し側でアップロード済み分を巻き戻すこと）。
 */
export async function ingestExternalImage(userId: string, url: string): Promise<ScheduledImage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`メディア取得に失敗しました（${url}）: ${msg}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`メディア取得に失敗しました（${url}）: HTTP ${res.status}`);

  const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) {
    throw new Error(`非対応のメディア形式です（${url}）: ${mime || 'unknown'}。v1 は画像（jpeg/png/gif/webp）のみ対応です`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength === 0) throw new Error(`メディアが空です（${url}）`);
  if (buf.byteLength > MAX_MEDIA_BYTES) {
    throw new Error(`メディアサイズが上限(5MB)を超えています（${url}）: ${Math.round(buf.byteLength / 1024)}KB`);
  }

  const path = `${userId}/${randomUUID()}.${ext}`;
  const admin = getSupabaseAdmin();
  const { error: uploadError } = await admin.storage.from('post-uploads').upload(path, buf, {
    contentType: mime,
    cacheControl: 'no-store',
    upsert: false,
  });
  if (uploadError) throw new Error(`Storage アップロード失敗: ${uploadError.message}`);

  const { data } = admin.storage.from('post-uploads').getPublicUrl(path);
  if (!data?.publicUrl) {
    await admin.storage.from('post-uploads').remove([path]).catch(() => undefined);
    throw new Error('Storage public URL の取得に失敗しました');
  }
  return { path, publicUrl: data.publicUrl };
}

// ─────────────────────────────────────────────
// 本文長バリデーション（X の weighted length 近似）
// ─────────────────────────────────────────────

const URL_PATTERN = /https?:\/\/\S+/g;
/** X 上で URL は短縮されて一律 23 文字換算になる */
const URL_WEIGHT = 23;

/**
 * X の weighted length（上限 280）を近似計算する。
 * twitter-text の仕様に倣い、Latin 系等の一部レンジは 1、それ以外（CJK・絵文字等）は 2 と数え、
 * URL は一律 23 と換算する。厳密実装ではないため、判定は「明確な超過の早期検出」用途に限る
 * （すり抜けた場合も投稿時に X 側が拒否し post.failed で通知される）。
 */
export function weightedPostLength(text: string): number {
  let total = 0;
  const withoutUrls = text.replace(URL_PATTERN, () => {
    total += URL_WEIGHT;
    return '';
  });
  for (const ch of withoutUrls) {
    const cp = ch.codePointAt(0) ?? 0;
    const isLight =
      cp <= 0x10ff ||                    // Latin / ギリシャ / キリル等
      (cp >= 0x2000 && cp <= 0x200d) ||  // 一般句読点の一部
      (cp >= 0x2010 && cp <= 0x201f) ||
      (cp >= 0x2032 && cp <= 0x2037);
    total += isLight ? 1 : 2;
  }
  return total;
}

/** X の weighted 上限 */
export const X_MAX_WEIGHTED_LENGTH = 280;
/** Threads の文字数上限 */
export const THREADS_MAX_LENGTH = 500;
