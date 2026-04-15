-- ============================================================
-- Google OAuth 認証対応: 全テーブルに user_id を追加
-- Supabase Auth (auth.users) と連携
-- ============================================================

-- ── x_accounts ──────────────────────────────────────────────
-- 1ユーザー1アカウントに変更
ALTER TABLE x_accounts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 複数アクティブ制約を削除（1ユーザー1件なので不要）
DROP INDEX IF EXISTS x_accounts_single_active;

-- 1ユーザーにつき1アカウントの制約
CREATE UNIQUE INDEX IF NOT EXISTS x_accounts_one_per_user
  ON x_accounts (user_id);

-- RLS 有効化
ALTER TABLE x_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own x_accounts" ON x_accounts;
CREATE POLICY "Users can manage own x_accounts" ON x_accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── post_personas ───────────────────────────────────────────
ALTER TABLE post_personas
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE post_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own personas" ON post_personas;
CREATE POLICY "Users can manage own personas" ON post_personas
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── scheduled_posts ─────────────────────────────────────────
ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own scheduled_posts" ON scheduled_posts;
CREATE POLICY "Users can manage own scheduled_posts" ON scheduled_posts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── generated_posts ─────────────────────────────────────────
ALTER TABLE generated_posts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE generated_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own generated_posts" ON generated_posts;
CREATE POLICY "Users can manage own generated_posts" ON generated_posts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── post_metrics ────────────────────────────────────────────
ALTER TABLE post_metrics
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own post_metrics" ON post_metrics;
CREATE POLICY "Users can manage own post_metrics" ON post_metrics
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
