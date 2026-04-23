-- ============================================================
-- follow_candidates に sample_tweet_id カラムを追加
-- 「いいね＆フォロー」機能で対象ツイートに like を打つために必要
-- ============================================================

ALTER TABLE follow_candidates
  ADD COLUMN IF NOT EXISTS sample_tweet_id text;

COMMENT ON COLUMN follow_candidates.sample_tweet_id IS
  '探索時にヒットした直近ツイートの X tweet id。いいね＆フォロー機能で参照。';
