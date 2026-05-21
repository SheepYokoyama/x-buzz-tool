-- ============================================================
-- scheduled_posts に payload JSONB カラムを追加し、
-- ポスト作成画面と同等の構造（分割テキスト・モード・プラットフォーム・画像）を
-- 予約投稿でも扱えるようにする。
--
-- 既存行（payload IS NULL）は cron 側で旧仕様 = content のみを X 単独投稿、として処理する。
--
-- payload の想定スキーマ:
--   {
--     "version": 1,
--     "mode": "thread" | "separate" | "none",
--     "platforms": ["x", "threads"],
--     "numbering": false,
--     "chunks": [
--       {
--         "text": "...",
--         "images": [{ "path": "user/uuid.jpg", "publicUrl": "https://..." }]
--       }
--     ],
--     "results": {                       -- cron 実行後に書き込まれる
--       "x":       [{ "postId": "...", "url": "..." }] | null,
--       "threads": [{ "postId": "...", "url": "..." }] | null,
--       "errors":  { "x": "...", "threads": "..." }
--     }
--   }
-- ============================================================

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS payload jsonb;

-- payload.version でのフィルタ用インデックス（新形式のレコードを cron で素早く識別）
CREATE INDEX IF NOT EXISTS scheduled_posts_payload_version_idx
  ON scheduled_posts ((payload ->> 'version'))
  WHERE payload IS NOT NULL;
