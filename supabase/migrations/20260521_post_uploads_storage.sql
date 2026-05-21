-- ============================================================
-- 予約投稿用 永続 Storage バケット `post-uploads`
--   ・予約時刻まで画像を保持するため、Threads 用の即削除バケット
--     (`threads-uploads`) とは別物
--   ・cron 実行で投稿成立後、または予約キャンセル/削除時に該当画像を掃除する
--   ・X の v1 メディアアップロードと Threads の image_url の双方で参照するため public
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-uploads',
  'post-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "post-uploads: public read"  ON storage.objects;
DROP POLICY IF EXISTS "post-uploads: owner insert" ON storage.objects;
DROP POLICY IF EXISTS "post-uploads: owner delete" ON storage.objects;
DROP POLICY IF EXISTS "post-uploads: owner update" ON storage.objects;

CREATE POLICY "post-uploads: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-uploads');

CREATE POLICY "post-uploads: owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "post-uploads: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "post-uploads: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'post-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
