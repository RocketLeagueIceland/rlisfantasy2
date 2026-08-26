-- Multi-season support.
-- Adds a seasons table, stamps all existing data as Season 11, converts the
-- single-season unique constraints to per-season ones, and makes writes
-- season-aware. Old seasons become read-only for users (service role bypasses).

-- ============ SEASONS TABLE ============
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  initial_budget INTEGER NOT NULL DEFAULT 100000000,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- At most one current season
CREATE UNIQUE INDEX one_current_season ON seasons(is_current) WHERE is_current;

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons are publicly readable"
  ON seasons FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert seasons"
  ON seasons FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update seasons"
  ON seasons FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete seasons"
  ON seasons FOR DELETE
  USING (is_admin());

-- Everything that exists today is Season 11.
-- initial_budget matches INITIAL_BUDGET in src/lib/scoring/constants.ts (the
-- 10M default on fantasy_teams.budget_remaining was never used - the app
-- always passed the value explicitly).
INSERT INTO seasons (number, name, is_current, initial_budget, starts_at)
VALUES (11, 'Season 11', TRUE, 100000000, '2026-02-01T00:00:00Z');

CREATE OR REPLACE FUNCTION current_season_id()
RETURNS UUID AS $$
  SELECT id FROM seasons WHERE is_current LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============ SEASON_ID COLUMNS + CONSTRAINT SWAPS ============
-- Each column gets DEFAULT current_season_id() so inserts from code deployed
-- before this migration (which doesn't send season_id) keep working.

-- weeks: week numbering restarts each season
ALTER TABLE weeks ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE RESTRICT DEFAULT current_season_id();
UPDATE weeks SET season_id = (SELECT id FROM seasons WHERE number = 11);
ALTER TABLE weeks ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE weeks DROP CONSTRAINT weeks_week_number_key;
ALTER TABLE weeks ADD CONSTRAINT weeks_season_week_number_key UNIQUE (season_id, week_number);
CREATE INDEX idx_weeks_season_id ON weeks(season_id);

-- fantasy_teams: one team per user per season
ALTER TABLE fantasy_teams ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE RESTRICT DEFAULT current_season_id();
UPDATE fantasy_teams SET season_id = (SELECT id FROM seasons WHERE number = 11);
ALTER TABLE fantasy_teams ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE fantasy_teams DROP CONSTRAINT fantasy_teams_user_id_key;
ALTER TABLE fantasy_teams ADD CONSTRAINT fantasy_teams_user_season_key UNIQUE (user_id, season_id);
CREATE INDEX idx_fantasy_teams_season_id ON fantasy_teams(season_id);

-- rl_players: rosters, teams and prices are per-season facts
ALTER TABLE rl_players ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE RESTRICT DEFAULT current_season_id();
UPDATE rl_players SET season_id = (SELECT id FROM seasons WHERE number = 11);
ALTER TABLE rl_players ALTER COLUMN season_id SET NOT NULL;
CREATE INDEX idx_rl_players_season_id ON rl_players(season_id);

-- playoff_predictions: one prediction per user per season
ALTER TABLE playoff_predictions ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE RESTRICT DEFAULT current_season_id();
UPDATE playoff_predictions SET season_id = (SELECT id FROM seasons WHERE number = 11);
ALTER TABLE playoff_predictions ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE playoff_predictions DROP CONSTRAINT playoff_predictions_user_unique;
ALTER TABLE playoff_predictions ADD CONSTRAINT playoff_predictions_user_season_key UNIQUE (user_id, season_id);
CREATE INDEX idx_playoff_predictions_season_id ON playoff_predictions(season_id);

-- player_stats, weekly_scores, transfers and fantasy_team_players inherit
-- their season through week_id / fantasy_team_id - no columns needed.

-- ============ DROP DEAD SEASON-BLIND OBJECTS ============
-- None of these are referenced by the app. scoreboard_view also had a bug
-- (the scores_published join condition filtered nothing). The app computes
-- the scoreboard and current week in TypeScript.
DROP VIEW IF EXISTS scoreboard_view;
DROP FUNCTION IF EXISTS get_current_week();
DROP FUNCTION IF EXISTS can_make_transfer(UUID);

-- ============ HARDEN TRANSFER VALIDATION ============
-- Previously trusted any client-supplied week_id and only checked its window
-- flag. Now also requires the week to belong to the current season.
CREATE OR REPLACE FUNCTION validate_transfer()
RETURNS TRIGGER AS $$
DECLARE
  window_open BOOLEAN;
  week_season UUID;
  existing_transfer UUID;
BEGIN
  SELECT transfer_window_open, season_id INTO window_open, week_season
  FROM weeks
  WHERE id = NEW.week_id;

  IF week_season IS NULL OR week_season IS DISTINCT FROM current_season_id() THEN
    RAISE EXCEPTION 'Transfers are only allowed for the current season';
  END IF;

  IF NOT window_open THEN
    RAISE EXCEPTION 'Transfer window is not open for this week';
  END IF;

  SELECT id INTO existing_transfer
  FROM transfers
  WHERE fantasy_team_id = NEW.fantasy_team_id
    AND week_id = NEW.week_id;

  IF existing_transfer IS NOT NULL THEN
    RAISE EXCEPTION 'Already made a transfer this week';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============ SEASON-AWARE WRITE POLICIES ============
-- Past seasons are read-only for users: team creation/edits, lineup changes,
-- transfers and predictions only work against the current season.

DROP POLICY IF EXISTS "Users can create own team" ON fantasy_teams;
CREATE POLICY "Users can create own team"
  ON fantasy_teams FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND season_id = current_season_id()
  );

DROP POLICY IF EXISTS "Users can update own team" ON fantasy_teams;
CREATE POLICY "Users can update own team"
  ON fantasy_teams FOR UPDATE
  USING (auth.uid() = user_id AND season_id = current_season_id())
  WITH CHECK (auth.uid() = user_id AND season_id = current_season_id());

DROP POLICY IF EXISTS "Users can insert own team players" ON fantasy_team_players;
CREATE POLICY "Users can insert own team players"
  ON fantasy_team_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id
        AND user_id = auth.uid()
        AND season_id = current_season_id()
    )
  );

DROP POLICY IF EXISTS "Users can update own team players" ON fantasy_team_players;
CREATE POLICY "Users can update own team players"
  ON fantasy_team_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id
        AND user_id = auth.uid()
        AND season_id = current_season_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id
        AND user_id = auth.uid()
        AND season_id = current_season_id()
    )
  );

DROP POLICY IF EXISTS "Users can delete own team players" ON fantasy_team_players;
CREATE POLICY "Users can delete own team players"
  ON fantasy_team_players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id
        AND user_id = auth.uid()
        AND season_id = current_season_id()
    )
  );

DROP POLICY IF EXISTS "Users can create own transfers" ON transfers;
CREATE POLICY "Users can create own transfers"
  ON transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_id
        AND user_id = auth.uid()
        AND season_id = current_season_id()
    )
  );

DROP POLICY IF EXISTS "Users can insert own prediction" ON playoff_predictions;
CREATE POLICY "Users can insert own prediction"
  ON playoff_predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND season_id = current_season_id()
  );
