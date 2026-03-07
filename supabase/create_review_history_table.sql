-- ============================================
-- chapter_review_history
-- Stores every review cycle for each chapter:
--   AI report data + admin comment + decision
-- ============================================

CREATE TABLE IF NOT EXISTS chapter_review_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  review_number INTEGER NOT NULL DEFAULT 1,

  -- AI report data (from analyze-chapter edge function)
  genre_analysis JSONB,
  content_sensitivity JSONB,
  writing_style JSONB,
  summary TEXT,
  chapter_type TEXT,
  target_audience TEXT,

  -- Admin decision
  admin_comment TEXT,
  decision TEXT CHECK (decision IN ('approved', 'rejected')),
  decided_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by chapter
CREATE INDEX IF NOT EXISTS idx_review_history_chapter
  ON chapter_review_history (chapter_id, review_number DESC);

-- Enable Row Level Security
ALTER TABLE chapter_review_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admins) to read/write
CREATE POLICY "Allow all for authenticated users"
  ON chapter_review_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
