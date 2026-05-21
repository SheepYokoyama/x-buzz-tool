-- ============================================================
-- Threads 画像投稿用 Storage バケット
--   Meta Graph API は file upload 不可で公開URL指定方式のため、
--   投稿時に一時的に画像をここに公開アップロードし、投稿成立後に削除する。
--   ・public バケット（Meta クローラが匿名 GET する必要があるため）
--   ・5MB 上限・画像 MIME のみ許可
--   ・パスは `${user_id}/${uuid}.${ext}` を想定し、INSERT/DELETE は本人のみ
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'threads-uploads',
  'threads-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 既存ポリシーがあれば削除（冪等にする）──
DROP POLICY IF EXISTS "threads-uploads: public read"           ON storage.objects;
DROP POLICY IF EXISTS "threads-uploads: owner insert"          ON storage.objects;
DROP POLICY IF EXISTS "threads-uploads: owner delete"          ON storage.objects;
DROP POLICY IF EXISTS "threads-uploads: owner update"          ON storage.objects;

-- ── 誰でも GET 可（Meta クローラが匿名で叩く）──
CREATE POLICY "threads-uploads: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'threads-uploads');

-- ── INSERT/DELETE/UPDATE は path 第1セグメントが auth.uid() の場合のみ ──
-- ※ サーバー側は service_role キーで操作するため RLS バイパス可。
--    これらのポリシーは Browser 側から直接叩かれた場合のガード。
CREATE POLICY "threads-uploads: owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'threads-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "threads-uploads: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'threads-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "threads-uploads: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'threads-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'threads-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
