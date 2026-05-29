/**
 * Instagram (Instagram API with Instagram Login) クライアント
 *
 * Threads と同様に OAuth 2.0 のアクセストークン1本で動く `graph.instagram.com` の
 * `me/media` 系エンドポイントを使う方式（Facebook ページ連携不要）。
 * Meta アプリに instagram_business_basic / instagram_business_content_publish 権限が必要。
 * Long-lived access token を social_accounts.access_token に暗号化保存して利用する。
 *
 * Threads との決定的な違い:
 *   - フィード投稿は必ずメディア（画像）が1枚以上必要。テキストのみ投稿は不可。
 *   - リプライ連結（スレッド）が存在しない。本ツールでは単一投稿のみ対応する。
 *
 * 参考: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 */
import { getSupabaseAdmin } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

const INSTAGRAM_API_BASE = 'https://graph.instagram.com/v21.0';
const VERIFY_TIMEOUT_MS = 10_000;

export interface VerifiedInstagramUser {
  id: string;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
}

export type InstagramVerifyErrorCode =
  | 'invalid_token'
  | 'forbidden'
  | 'rate_limit'
  | 'network'
  | 'unknown';

export interface InstagramVerifyResult {
  ok: boolean;
  user?: VerifiedInstagramUser;
  errorCode?: InstagramVerifyErrorCode;
  error?: string;
}

/**
 * 与えられた Instagram アクセストークンが有効かを graph.instagram.com の /me で検証する。
 * 登録・更新時の認証確立確認に使用。
 */
export async function verifyInstagramTokens(tokens: {
  access_token: string;
}): Promise<InstagramVerifyResult> {
  try {
    const url = new URL(`${INSTAGRAM_API_BASE}/me`);
    url.searchParams.set('fields', 'user_id,username,name,profile_picture_url');
    url.searchParams.set('access_token', tokens.access_token);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 400) {
      return {
        ok: false,
        errorCode: 'invalid_token',
        error: 'トークンが無効です。Meta アプリで Instagram アクセストークンを再発行してから登録してください。',
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        errorCode: 'forbidden',
        error: 'Instagram API の権限が不足しています。アプリの Instagram 関連スコープ（instagram_business_basic, instagram_business_content_publish）の許可をご確認ください。',
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        errorCode: 'rate_limit',
        error: 'Instagram API のレート制限に達しました。しばらく待ってから再試行してください。',
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        errorCode: 'unknown',
        error: `認証確認に失敗しました: HTTP ${res.status} ${text}`,
      };
    }

    const data = (await res.json()) as {
      id?: string;
      user_id?: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
    };

    return {
      ok: true,
      user: {
        id: data.user_id ?? data.id ?? '',
        username: data.username ?? '',
        name: data.name ?? null,
        profileImageUrl: data.profile_picture_url ?? null,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('aborted') || message.includes('timeout')) {
      return {
        ok: false,
        errorCode: 'network',
        error: 'Instagram API への接続がタイムアウトしました。時間をおいて再試行してください。',
      };
    }
    return {
      ok: false,
      errorCode: 'unknown',
      error: `認証確認に失敗しました: ${message}`,
    };
  }
}

/**
 * 指定ユーザーのアクティブな Instagram アカウントの復号済みアクセストークンを返す。
 * 投稿 API から利用する想定。未設定の場合は null。
 */
export async function getActiveInstagramAccessToken(userId: string): Promise<string | null> {
  if (!userId) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (getSupabaseAdmin() as any)
    .from('social_accounts')
    .select('access_token')
    .eq('is_active', true)
    .eq('platform', 'instagram')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.access_token) return null;
  try {
    return decrypt(data.access_token);
  } catch {
    return null;
  }
}

/** 指定ユーザーのアクティブな Instagram アカウントの UUID を返す。未設定の場合は null。 */
export async function getActiveInstagramAccountId(userId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (getSupabaseAdmin() as any)
    .from('social_accounts')
    .select('id')
    .eq('is_active', true)
    .eq('platform', 'instagram')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** 指定ユーザーに認証済み Instagram アカウントが存在するか確認 */
export async function isInstagramConfiguredAsync(userId: string): Promise<boolean> {
  const token = await getActiveInstagramAccessToken(userId);
  return token !== null;
}

// ─────────────────────────────────────────────────────────────
// 投稿系
// ─────────────────────────────────────────────────────────────

export interface InstagramPostResult {
  id: string;
  permalink: string | null;
}

/** キャプション上限（Instagram 仕様） */
export const INSTAGRAM_CAPTION_MAX = 2_200;
/** カルーセル枚数（Instagram 仕様は 2〜10 件） */
const CAROUSEL_MIN = 2;
const CAROUSEL_MAX = 10;
/** メディアコンテナの処理完了待ちポーリング設定 */
const CONTAINER_POLL_INTERVAL_MS = 1_500;
const CONTAINER_POLL_TIMEOUT_MS  = 30_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * メディアコンテナの status_code が FINISHED になるまでポーリング。
 * 画像をクローラが取りに行く処理が非同期のため、即 publish するとエラーになる。
 *
 * 戻り値:
 *   - 'FINISHED': 公開可能
 *   - 'ERROR'  : 失敗
 *   - 'TIMEOUT': タイムアウト（呼び出し側でハンドリング）
 */
async function waitForContainerReady(
  containerId: string,
  accessToken: string,
): Promise<{ status: 'FINISHED' } | { status: 'ERROR'; message: string } | { status: 'TIMEOUT' }> {
  const deadline = Date.now() + CONTAINER_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const url = new URL(`${INSTAGRAM_API_BASE}/${containerId}`);
    url.searchParams.set('fields', 'status_code');
    url.searchParams.set('access_token', accessToken);
    try {
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = (await res.json()) as { status_code?: string };
        if (data.status_code === 'FINISHED') return { status: 'FINISHED' };
        if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
          return { status: 'ERROR', message: `container status_code=${data.status_code}` };
        }
        // IN_PROGRESS / PUBLISHED 以外は継続待機
      }
    } catch {
      /* 一時的ネットワーク失敗は次の poll で吸収 */
    }
    await sleep(CONTAINER_POLL_INTERVAL_MS);
  }
  return { status: 'TIMEOUT' };
}

/** POST /me/media でコンテナを作成し、id を返す共通処理 */
async function createInstagramContainer(
  accessToken: string,
  params: Record<string, string>,
): Promise<string> {
  const url = new URL(`${INSTAGRAM_API_BASE}/me/media`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Instagram コンテナ作成に失敗: HTTP ${res.status} ${body}`);
  }
  const data = (await res.json()) as { id: string };
  if (!data?.id) throw new Error('Instagram コンテナ作成: id が返りませんでした');
  return data.id;
}

/**
 * 単一 Instagram 投稿を行う。Instagram フィード投稿は必ず画像が1枚以上必要。
 *
 * Meta Instagram 投稿は 2 段階:
 *   1. POST /me/media         — メディアコンテナ作成
 *      - 画像 1 枚: image_url=..., caption=...
 *      - 画像 2 枚以上: 子コンテナ × n (is_carousel_item=true) → 親コンテナ (media_type=CAROUSEL, children=..., caption=...)
 *   2. POST /me/media_publish — コンテナを公開
 *
 * クローラが画像を取得する非同期処理があるため、コンテナの status_code が
 * FINISHED になるまでポーリングしてから publish する。
 */
export async function postInstagramSingle(params: {
  accessToken: string;
  caption: string;
  /** Meta Graph API に渡す公開 image URL（Supabase Storage 等にアップロード済みのもの）*/
  imageUrls: string[];
}): Promise<InstagramPostResult> {
  const { accessToken, caption } = params;
  const imageUrls = (params.imageUrls ?? []).filter(Boolean).slice(0, CAROUSEL_MAX);

  if (imageUrls.length === 0) {
    throw new Error('Instagram 投稿には画像が1枚以上必要です');
  }

  // ── 1) コンテナ作成 ──────────────────────────────
  let containerId: string;

  if (imageUrls.length === 1) {
    containerId = await createInstagramContainer(accessToken, {
      image_url: imageUrls[0],
      caption,
    });
  } else {
    // カルーセル（2〜10枚）: 子コンテナを並列作成 → それぞれの完了を待って親を生成
    if (imageUrls.length < CAROUSEL_MIN) {
      throw new Error('Instagram カルーセルは2枚以上必要です');
    }
    const childIds = await Promise.all(
      imageUrls.map((url) =>
        createInstagramContainer(accessToken, {
          image_url: url,
          is_carousel_item: 'true',
        }),
      ),
    );
    for (const cid of childIds) {
      const r = await waitForContainerReady(cid, accessToken);
      if (r.status === 'ERROR')   throw new Error(`Instagram 画像処理に失敗: ${r.message}`);
      if (r.status === 'TIMEOUT') throw new Error('Instagram 画像処理がタイムアウトしました（30秒）');
    }
    containerId = await createInstagramContainer(accessToken, {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption,
    });
  }

  // ── 2) 公開前にコンテナ完了を待つ ──────────────────
  {
    const r = await waitForContainerReady(containerId, accessToken);
    if (r.status === 'ERROR')   throw new Error(`Instagram コンテナ処理に失敗: ${r.message}`);
    if (r.status === 'TIMEOUT') throw new Error('Instagram コンテナ処理がタイムアウトしました（30秒）');
  }

  // ── 3) 公開 ───────────────────────────────────
  const publishUrl = new URL(`${INSTAGRAM_API_BASE}/me/media_publish`);
  publishUrl.searchParams.set('creation_id', containerId);
  publishUrl.searchParams.set('access_token', accessToken);

  const publishRes = await fetch(publishUrl.toString(), { method: 'POST' });
  if (!publishRes.ok) {
    const body = await publishRes.text().catch(() => '');
    throw new Error(`Instagram 公開に失敗: HTTP ${publishRes.status} ${body}`);
  }
  const published = (await publishRes.json()) as { id: string };

  // ── 4) permalink 取得（失敗しても投稿自体は成立しているので無視）──
  let permalink: string | null = null;
  try {
    const detailUrl = new URL(`${INSTAGRAM_API_BASE}/${published.id}`);
    detailUrl.searchParams.set('fields', 'permalink');
    detailUrl.searchParams.set('access_token', accessToken);
    const detailRes = await fetch(detailUrl.toString());
    if (detailRes.ok) {
      const detail = (await detailRes.json()) as { permalink?: string };
      permalink = detail.permalink ?? null;
    }
  } catch {
    /* permalink 取得失敗は致命的ではない */
  }

  return { id: published.id, permalink };
}
