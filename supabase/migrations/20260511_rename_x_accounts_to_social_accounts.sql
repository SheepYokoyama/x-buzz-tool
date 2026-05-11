-- ============================================================
-- x_accounts を social_accounts にリネームし、複数プラットフォーム対応にする
--   - X (Twitter) と Threads (Meta) を同一テーブルで管理
--   - 1ユーザー × プラットフォーム ごとに 1 アカウント
-- ============================================================

-- ── テーブルリネーム（FK参照は自動で追従するためここでは触らない）──
ALTER TABLE IF EXISTS x_accounts RENAME TO social_accounts;

-- ── platform カラム追加（既存行は 'x' で埋める）──
ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'x';

ALTER TABLE social_accounts
  ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('x', 'threads'));

-- ── UNIQUE 制約を「user_id」→「(user_id, platform)」に差し替え ──
DROP INDEX IF EXISTS x_accounts_one_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_one_per_user_platform
  ON social_accounts (user_id, platform);

-- ── RLS ポリシーを再作成（テーブルリネームに合わせて旧名ポリシーを破棄）──
DROP POLICY IF EXISTS "Users can manage own x_accounts" ON social_accounts;
CREATE POLICY "Users can manage own social_accounts" ON social_accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
