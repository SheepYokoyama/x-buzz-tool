-- 予約投稿の重複投稿バグ対策: 実行前ロック（claim）用カラムを追加
--
-- 背景:
--   cron は「投稿してから status を published/failed に更新」する作りだった。
--   そのため Threads の画像/スレッド投稿などで処理が Vercel の関数上限(60s)を超えると、
--   投稿は成立しているのに status 更新前に関数が強制終了し、行が 'scheduled' のまま残る。
--   次の cron 実行が同じ行を再度拾い、同一内容を何度も投稿してしまっていた。
--
-- 対策:
--   投稿の「前」に locked_at を立てて行を確保（claim）する。
--   - due 抽出は locked_at IS NULL の行のみ対象にする
--   - claim は「status='scheduled' AND locked_at IS NULL」を条件にした原子的 UPDATE で行う
--     （取得できなければ他の実行が確保済み → スキップ。実行が重なっても二重投稿しない）
--   - claim 済みのまま finalize されず取り残された行（途中クラッシュ）は、
--     status='scheduled' のまま残るため、cron 冒頭のリカバリで 'failed' に倒す（再投稿はしない）。

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- due 抽出（status='scheduled' AND locked_at IS NULL AND scheduled_at <= now()）の高速化
CREATE INDEX IF NOT EXISTS scheduled_posts_due_idx
  ON scheduled_posts (scheduled_at)
  WHERE status = 'scheduled' AND locked_at IS NULL;
