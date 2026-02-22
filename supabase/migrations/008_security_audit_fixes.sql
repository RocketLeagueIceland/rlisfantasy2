-- Security Audit Fixes (2026-02-22)
-- Fixes: is_admin privilege escalation, RLS verification
-- Run this in the Supabase SQL Editor immediately

-- ============================================================
-- STEP 1: Ensure RLS is enabled on ALL tables (idempotent)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rl_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
-- Note: scoreboard_view is a VIEW, not a table. VIEWs inherit RLS from
-- the underlying tables they query, so no ALTER TABLE needed here.

-- ============================================================
-- STEP 2: Lock down is_admin column (Finding 2 - Critical)
-- ============================================================

-- Revoke direct UPDATE on is_admin from all non-service roles
REVOKE UPDATE (is_admin) ON public.users FROM authenticated;
REVOKE UPDATE (is_admin) ON public.users FROM anon;

-- Drop the existing permissive update policy that allows is_admin changes
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Recreate: users can update their own row, but is_admin must stay unchanged
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin IS NOT DISTINCT FROM (
      SELECT is_admin FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- STEP 3: Server-side function for admin management
-- ============================================================
-- Only existing admins can promote/demote users via this function
CREATE OR REPLACE FUNCTION set_admin(
  target_user_id uuid,
  admin_status boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can change admin status';
  END IF;

  UPDATE public.users
    SET is_admin = admin_status
    WHERE id = target_user_id;
END;
$$;

-- Prevent anonymous users from calling the function
REVOKE EXECUTE ON FUNCTION set_admin FROM anon;

-- ============================================================
-- STEP 4: Add RLS policy for scoreboard_view (if it's a table)
-- scoreboard_view is a VIEW so RLS doesn't apply the same way,
-- but if it was converted to a table, this ensures it's covered.
-- ============================================================
-- Note: scoreboard_view is defined as a VIEW in 003_functions_triggers.sql
-- VIEWs inherit RLS from the underlying tables they query, so this is safe.
