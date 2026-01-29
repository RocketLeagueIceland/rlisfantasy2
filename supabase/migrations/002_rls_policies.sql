-- Row Level Security Policies for RLIS Fantasy League

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ USERS TABLE ============
-- Users can read all profiles (for scoreboard/profiles)
CREATE POLICY "Users are publicly readable"
  ON users FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users are created via trigger (see below)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can update any user (for admin role management)
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============ RL_PLAYERS TABLE ============
-- Everyone can read players
CREATE POLICY "RL players are publicly readable"
  ON rl_players FOR SELECT
  USING (true);

-- Only admins can modify players
CREATE POLICY "Admins can insert rl_players"
  ON rl_players FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update rl_players"
  ON rl_players FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete rl_players"
  ON rl_players FOR DELETE
  USING (is_admin());

-- ============ FANTASY_TEAMS TABLE ============
-- Everyone can read teams (for scoreboard/profiles)
CREATE POLICY "Fantasy teams are publicly readable"
  ON fantasy_teams FOR SELECT
  USING (true);

-- Users can create their own team
CREATE POLICY "Users can create own team"
  ON fantasy_teams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own team
CREATE POLICY "Users can update own team"
  ON fantasy_teams FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ FANTASY_TEAM_PLAYERS TABLE ============
-- Everyone can read team players (for profiles)
CREATE POLICY "Team players are publicly readable"
  ON fantasy_team_players FOR SELECT
  USING (true);

-- Users can manage players on their own team
CREATE POLICY "Users can insert own team players"
  ON fantasy_team_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own team players"
  ON fantasy_team_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own team players"
  ON fantasy_team_players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id AND user_id = auth.uid()
    )
  );

-- ============ WEEKS TABLE ============
-- Everyone can read weeks
CREATE POLICY "Weeks are publicly readable"
  ON weeks FOR SELECT
  USING (true);

-- Only admins can manage weeks
CREATE POLICY "Admins can insert weeks"
  ON weeks FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update weeks"
  ON weeks FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete weeks"
  ON weeks FOR DELETE
  USING (is_admin());

-- ============ PLAYER_STATS TABLE ============
-- Everyone can read stats (for score breakdown)
CREATE POLICY "Player stats are publicly readable"
  ON player_stats FOR SELECT
  USING (true);

-- Only admins can manage stats
CREATE POLICY "Admins can insert player_stats"
  ON player_stats FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update player_stats"
  ON player_stats FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete player_stats"
  ON player_stats FOR DELETE
  USING (is_admin());

-- ============ WEEKLY_SCORES TABLE ============
-- Everyone can read scores (for scoreboard)
CREATE POLICY "Weekly scores are publicly readable"
  ON weekly_scores FOR SELECT
  USING (true);

-- Only admins can manage scores
CREATE POLICY "Admins can insert weekly_scores"
  ON weekly_scores FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update weekly_scores"
  ON weekly_scores FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete weekly_scores"
  ON weekly_scores FOR DELETE
  USING (is_admin());

-- ============ TRANSFERS TABLE ============
-- Everyone can read transfers (transparency)
CREATE POLICY "Transfers are publicly readable"
  ON transfers FOR SELECT
  USING (true);

-- Users can create transfers for their own team
CREATE POLICY "Users can create own transfers"
  ON transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id AND user_id = auth.uid()
    )
  );
