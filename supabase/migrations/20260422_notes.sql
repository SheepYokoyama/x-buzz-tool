-- ============================================================
-- ノート（メモ帳）機能用テーブル
-- ユーザーごとに自由記述のメモを管理
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  is_important boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_user_id_updated_at
  ON notes (user_id, updated_at DESC);

-- RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notes" ON notes;
CREATE POLICY "Users can manage own notes" ON notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
