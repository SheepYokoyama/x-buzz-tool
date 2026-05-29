-- ============================================================
-- social_accounts に Instagram プラットフォームを追加
--   X / Threads と同一テーブルで管理し、(user_id, platform) UNIQUE は既存制約を流用。
--   platform CHECK 制約に 'instagram' を許可する。
-- ============================================================

ALTER TABLE social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_platform_check;

ALTER TABLE social_accounts
  ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('x', 'threads', 'instagram'));
