-- ============================================================
-- Instagram 画像投稿用 Storage バケット
--   Instagram Graph API (graph.instagram.com) は file upload 不可で
--   公開URL指定方式（image_url）のため、投稿時に一時的に画像をここへ公開
--   アップロードし、投稿成立後（成功/失敗にかかわらず）削除する。
--   ・public バケット（Meta クローラが匿名 GET する必要があるため）
--   ・5MB 上限・画像 MIME のみ許可
--   ・パスは `${user_id}/${uuid}.${ext}` を想定し、INSERT/DELETE は本人のみ
--   ※ Threads 用 `threads-uploads` とは別バケット（即削除前提・用途分離）
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instagram-uploads',
  'instagram-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 既存ポリシーがあれば削除（冪等にする）──
DROP POLICY IF EXISTS "instagram-uploads: public read"  ON storage.objects;
DROP POLICY IF EXISTS "instagram-uploads: owner insert" ON storage.objects;
DROP POLICY IF EXISTS "instagram-uploads: owner delete" ON storage.objects;
DROP POLICY IF EXISTS "instagram-uploads: owner update" ON storage.objects;

-- ── 誰でも GET 可（Meta クローラが匿名で叩く）──
CREATE POLICY "instagram-uploads: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'instagram-uploads');

-- ── INSERT/DELETE/UPDATE は path 第1セグメントが auth.uid() の場合のみ ──
-- ※ サーバー側は service_role キーで操作するため RLS バイパス可。
--    これらのポリシーは Browser 側から直接叩かれた場合のガード。
CREATE POLICY "instagram-uploads: owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'instagram-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "instagram-uploads: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'instagram-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "instagram-uploads: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'instagram-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'instagram-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
