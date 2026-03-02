-- ============================================
-- ADMIN BLOCK/UNBLOCK AUTHOR - Run in Supabase SQL Editor
-- ============================================
-- This creates a SECURITY DEFINER function that allows
-- an authenticated admin to toggle the is_blocked status
-- on any author's profile, bypassing RLS.

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS toggle_author_block(UUID, BOOLEAN);

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION toggle_author_block(
    target_author_id UUID,
    block_status BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- Verify the caller is an admin
    SELECT role INTO caller_role
    FROM profiles
    WHERE id = auth.uid();

    IF caller_role IS NULL OR caller_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can block/unblock authors';
    END IF;

    -- Update the author's blocked status
    UPDATE profiles
    SET is_blocked = block_status
    WHERE id = target_author_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Author profile not found';
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION toggle_author_block(UUID, BOOLEAN) TO authenticated;
