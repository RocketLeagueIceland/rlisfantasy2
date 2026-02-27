-- Restrict private tables to own-data-only (Security Audit Finding 1)
-- Public data is served through scoreboard_view or via service-role in server components.
-- Tables that stay publicly readable: rl_players, player_stats, weeks

-- ============================================================
-- USERS TABLE — own profile only + admin read all
-- ============================================================
DROP POLICY IF EXISTS "Users are publicly readable" ON public.users;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (is_admin());

-- ============================================================
-- FANTASY_TEAMS — own teams only + admin read all
-- ============================================================
DROP POLICY IF EXISTS "Fantasy teams are publicly readable" ON public.fantasy_teams;

CREATE POLICY "Users can read own teams"
  ON public.fantasy_teams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all teams"
  ON public.fantasy_teams FOR SELECT
  USING (is_admin());

-- ============================================================
-- FANTASY_TEAM_PLAYERS — own team players only + admin read all
-- ============================================================
DROP POLICY IF EXISTS "Team players are publicly readable" ON public.fantasy_team_players;

CREATE POLICY "Users can read own team players"
  ON public.fantasy_team_players FOR SELECT
  USING (
    fantasy_team_id IN (
      SELECT id FROM public.fantasy_teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all team players"
  ON public.fantasy_team_players FOR SELECT
  USING (is_admin());

-- ============================================================
-- TRANSFERS — own transfers only + admin read all
-- ============================================================
DROP POLICY IF EXISTS "Transfers are publicly readable" ON public.transfers;

CREATE POLICY "Users can read own transfers"
  ON public.transfers FOR SELECT
  USING (
    fantasy_team_id IN (
      SELECT id FROM public.fantasy_teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all transfers"
  ON public.transfers FOR SELECT
  USING (is_admin());

-- ============================================================
-- WEEKLY_SCORES — own scores only + admin read all
-- ============================================================
DROP POLICY IF EXISTS "Weekly scores are publicly readable" ON public.weekly_scores;

CREATE POLICY "Users can read own scores"
  ON public.weekly_scores FOR SELECT
  USING (
    fantasy_team_id IN (
      SELECT id FROM public.fantasy_teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all scores"
  ON public.weekly_scores FOR SELECT
  USING (is_admin());
