-- ============================================
-- AUTHOR BLOCK ENFORCEMENT - Run in Supabase SQL Editor
-- ============================================

-- 1. Add is_blocked column to profiles (if it doesn't exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 2. RLS Policy: Hide blocked authors' books from ALL readers
-- First, make sure RLS is enabled on books
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it conflicts (safe to ignore "does not exist" errors)
DROP POLICY IF EXISTS "Hide blocked author books" ON books;

-- Create the policy: any SELECT on books automatically excludes blocked authors
CREATE POLICY "Hide blocked author books"
  ON books FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = books.author_id
      AND profiles.is_blocked = true
    )
  );

-- 3. Also hide chapters of blocked authors' books
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hide blocked author chapters" ON chapters;

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
