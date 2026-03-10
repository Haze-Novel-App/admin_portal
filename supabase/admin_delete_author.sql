-- ============================================
-- ADMIN DELETE AUTHOR - Run in Supabase SQL Editor
-- ============================================
-- This creates a SECURITY DEFINER function that allows
-- an authenticated admin to permanently delete an author
-- and ALL their related data (books, chapters, reviews, reading progress).
-- It also deletes the user from auth.users.

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_author_cascade(UUID);

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION delete_author_cascade(
    target_author_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
    book_ids UUID[];
    chapter_ids UUID[];
BEGIN
    -- 1. Verify the caller is an admin
    SELECT role INTO caller_role
    FROM profiles
    WHERE id = auth.uid();

    IF caller_role IS NULL OR caller_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can delete authors';
    END IF;

    -- 2. Verify the target author exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_author_id) THEN
        RAISE EXCEPTION 'Author profile not found';
    END IF;

    -- 3. Get all book IDs for this author
    SELECT ARRAY_AGG(id) INTO book_ids
    FROM books
    WHERE author_id = target_author_id;

    -- 4. If there are books, get all chapter IDs and delete related data
    IF book_ids IS NOT NULL THEN
        -- Get all chapter IDs
        SELECT ARRAY_AGG(id) INTO chapter_ids
        FROM chapters
        WHERE book_id = ANY(book_ids);

        -- Delete chapter review history (cascades from chapters, but being explicit)
        IF chapter_ids IS NOT NULL THEN
            DELETE FROM chapter_review_history
            WHERE chapter_id = ANY(chapter_ids);
        END IF;

        -- Delete reading progress for these books
        DELETE FROM reading_progress
        WHERE book_id = ANY(book_ids);

        -- Delete chapters (also cascades review history)
        DELETE FROM chapters
        WHERE book_id = ANY(book_ids);

        -- Delete likes for these books
        DELETE FROM likes
        WHERE book_id = ANY(book_ids);

        -- Delete books
        DELETE FROM books
        WHERE author_id = target_author_id;
    END IF;

    -- 5. Delete the profile
    DELETE FROM profiles
    WHERE id = target_author_id;

    -- 6. Delete the auth user
    DELETE FROM auth.users
    WHERE id = target_author_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_author_cascade(UUID) TO authenticated;
