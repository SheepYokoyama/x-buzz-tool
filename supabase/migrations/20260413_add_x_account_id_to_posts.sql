-- scheduled_posts にアクティブ X アカウントの紐付けを追加
-- 既存データは NULL（アカウント未紐付け）になる
ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS x_account_id uuid REFERENCES x_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS scheduled_posts_x_account_id_idx
  ON scheduled_posts (x_account_id);
