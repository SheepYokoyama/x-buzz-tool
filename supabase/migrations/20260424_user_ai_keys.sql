-- ユーザーごとの AI プロバイダ API キーを保存するテーブル
-- 各キーは AES-256-CBC（lib/encryption.ts）で暗号化して保存
CREATE TABLE IF NOT EXISTS user_ai_keys (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      text NOT NULL CHECK (provider IN ('gemini', 'anthropic')),
  encrypted_key text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

CREATE INDEX IF NOT EXISTS user_ai_keys_user_id_idx ON user_ai_keys (user_id);

-- RLS 有効化
ALTER TABLE user_ai_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own ai keys" ON user_ai_keys;
CREATE POLICY "Users can manage own ai keys" ON user_ai_keys
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
