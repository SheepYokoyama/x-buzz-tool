/**
 * 予約投稿の payload（scheduled_posts.payload JSONB）構造定義。
 *
 * ポスト作成画面と同等の情報（分割済みテキスト・モード・投稿先プラットフォーム・
 * 各ポストの添付画像）を予約時点で確定保存し、cron 時刻到来時にそのまま再生する。
 *
 * version 1 を新形式の起点とし、互換性が必要な変更時は version を上げる。
 * payload IS NULL のレコードは旧仕様（content のみの X 単独投稿）として扱う。
 */

export type ScheduledMode = 'thread' | 'separate' | 'none';
export type ScheduledPlatform = 'x' | 'threads' | 'instagram';

export interface ScheduledImage {
  /** post-uploads バケット内のオブジェクトパス（cleanup 時に使用）*/
  path: string;
  /** 公開URL。X v1 メディアアップロードと Threads image_url の両方で使用 */
  publicUrl: string;
}

export interface ScheduledChunk {
  text: string;
  images: ScheduledImage[];
}

export interface ScheduledPostResultItem {
  postId: string;
  url: string;
}

export interface ScheduledPostResults {
  /** プラットフォーム別の成功した投稿リスト（chunk 順）。未投稿は null */
  x:         ScheduledPostResultItem[] | null;
  threads:   ScheduledPostResultItem[] | null;
  /** Instagram は単一投稿のみ（要素は最大1件）。未投稿は null */
  instagram: ScheduledPostResultItem[] | null;
  /** プラットフォーム別の最終エラー（成功時は undefined）*/
  errors?: Partial<Record<ScheduledPlatform, string>>;
  /** cron が走った時刻 */
  executedAt?: string;
}

export interface ScheduledPostPayloadV1 {
  version: 1;
  mode: ScheduledMode;
  platforms: ScheduledPlatform[];
  numbering: boolean;
  chunks: ScheduledChunk[];
  results?: ScheduledPostResults;
}

export type ScheduledPostPayload = ScheduledPostPayloadV1;

/**
 * 任意の値が新形式の payload V1 として扱えるかを判定する。
 * cron は payload を見て新旧仕様の分岐を行うため、堅い判定が必要。
 */
export function isPayloadV1(value: unknown): value is ScheduledPostPayloadV1 {
  if (!value || typeof value !== 'object') return false;
  const v = value as { version?: unknown; chunks?: unknown; platforms?: unknown; mode?: unknown };
  if (v.version !== 1) return false;
  if (!Array.isArray(v.chunks)) return false;
  if (!Array.isArray(v.platforms)) return false;
  if (typeof v.mode !== 'string') return false;
  return true;
}

/** payload.chunks から含まれる全ての画像パスを抽出（Storage cleanup 用）*/
export function collectImagePaths(payload: ScheduledPostPayload): string[] {
  const paths: string[] = [];
  for (const c of payload.chunks) {
    for (const img of c.images) {
      if (img.path) paths.push(img.path);
    }
  }
  return paths;
}
