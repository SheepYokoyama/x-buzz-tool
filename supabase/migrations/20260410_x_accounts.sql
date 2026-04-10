-- X アカウント管理テーブル
-- トークンは AES-256-CBC で暗号化して保存（サーバー側で ENCRYPTION_KEY を使用）
CREATE TABLE IF NOT EXISTS x_accounts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  username       text,
  api_key        text,         -- encrypted
  api_secret     text,         -- encrypted
  access_token   text,         -- encrypted
  access_secret  text,         -- encrypted
  bearer_token   text,         -- encrypted (optional)
  is_active      boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 同時に1つだけアクティブになるよう partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS x_accounts_single_active
  ON x_accounts (is_active)
  WHERE is_active = true;
