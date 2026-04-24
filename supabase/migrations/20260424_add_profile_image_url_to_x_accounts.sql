-- X アカウントのプロフィール画像 URL を保持するカラム
-- 登録時の認証検証（verifyXTokens）時に X API から取得して保存
ALTER TABLE x_accounts
  ADD COLUMN IF NOT EXISTS profile_image_url text;
