-- ============================================
-- AUTHOR BLOCK ENFORCEMENT - Run in Supabase SQL Editor
-- ============================================

-- 1. Add is_blocked column to profiles (if it doesn't exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 2. Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BOOKS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Hide blocked author books" ON books;
DROP POLICY IF EXISTS "Allow all for authenticated users on books" ON books;
DROP POLICY IF EXISTS "Allow insert books" ON books;
DROP POLICY IF EXISTS "Allow update books" ON books;
DROP POLICY IF EXISTS "Allow delete books" ON books;

-- SELECT: Hide blocked authors' books
CREATE POLICY "Hide blocked author books"
  ON books FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = books.author_id
      AND profiles.is_blocked = true
    )
  );

-- INSERT / UPDATE / DELETE: Allow all authenticated users
CREATE POLICY "Allow insert books"
  ON books FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update books"
  ON books FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete books"
  ON books FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- CHAPTERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Hide blocked author chapters" ON chapters;
DROP POLICY IF EXISTS "Allow all for authenticated users on chapters" ON chapters;
DROP POLICY IF EXISTS "Allow insert chapters" ON chapters;
DROP POLICY IF EXISTS "Allow update chapters" ON chapters;
DROP POLICY IF EXISTS "Allow delete chapters" ON chapters;

-- SELECT: Hide blocked authors' chapters
CREATE POLICY "Hide blocked author chapters"
  ON chapters FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM books
      JOIN profiles ON profiles.id = books.author_id
      WHERE books.id = chapters.book_id
      AND profiles.is_blocked = true
    )
  );

-- INSERT / UPDATE / DELETE: Allow all authenticated users
CREATE POLICY "Allow insert chapters"
  ON chapters FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update chapters"
  ON chapters FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete chapters"
  ON chapters FOR DELETE
  USING (auth.role() = 'authenticated');
