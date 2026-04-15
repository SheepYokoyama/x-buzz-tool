-- ============================================================
-- Follow Hunt 機能: ペルソナと属性が近い X ユーザーを発見・フォロー
-- 候補の永続化 + ユーザー別の探索設定
-- ============================================================

-- ── follow_candidates: 探索で見つかった候補を永続化 ─────────
CREATE TABLE IF NOT EXISTS follow_candidates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id        uuid NOT NULL REFERENCES post_personas(id) ON DELETE CASCADE,
  x_user_id         text NOT NULL,
  username          text NOT NULL,
  display_name      text,
  bio               text,
  profile_image_url text,
  followers_count   int,
  following_count   int,
  ff_ratio          numeric(6,2),
  last_tweeted_at   timestamptz,
  matched_keywords  text[] NOT NULL DEFAULT '{}',
  sample_tweet_text text,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','followed','skipped','failed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  followed_at       timestamptz,
  UNIQUE (user_id, x_user_id)
);

CREATE INDEX IF NOT EXISTS follow_candidates_user_status_idx
  ON follow_candidates (user_id, status, created_at DESC);

ALTER TABLE follow_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own follow_candidates" ON follow_candidates;
CREATE POLICY "Users can manage own follow_candidates" ON follow_candidates
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── follow_hunt_settings: ユーザー別の探索パラメータ ────────
CREATE TABLE IF NOT EXISTS follow_hunt_settings (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_words     text[] NOT NULL DEFAULT ARRAY[
                     '副業','アフィリエイト','稼ぐ','売上',
                     'bot','相互','フォロバ','フォロバック',
                     '暗号','NFT','シグナル','利益確定',
                     '出会い','えっち'
                   ]::text[],
  min_ff_ratio     numeric(6,2) NOT NULL DEFAULT 1.0,
  max_ff_ratio     numeric(6,2) NOT NULL DEFAULT 1.5,
  min_followers    int NOT NULL DEFAULT 100,
  max_followers    int NOT NULL DEFAULT 5000,
  active_days      int NOT NULL DEFAULT 30,
  daily_follow_cap int NOT NULL DEFAULT 20,
  -- 1 回の探索で取得する tweets の最大数（コストに直結: $0.005 × この値 + $0.01 × profile数）
  max_results      int NOT NULL DEFAULT 20 CHECK (max_results BETWEEN 10 AND 100),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE follow_hunt_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own follow_hunt_settings" ON follow_hunt_settings;
CREATE POLICY "Users can manage own follow_hunt_settings" ON follow_hunt_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
