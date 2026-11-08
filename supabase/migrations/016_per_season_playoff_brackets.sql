-- Per-season playoff brackets.
-- Migration 010 hard-coded the Season 11 semifinal teams into CHECK
-- constraints on playoff_predictions, so no other season's bracket could be
-- stored. This moves the bracket into a table keyed by season and validates
-- predictions against it with a trigger. It also enforces the submission
-- deadline in the database, which was previously app-only.
--
-- Keep the rows here in sync with PLAYOFF_BRACKETS in
-- src/lib/predictions/constants.ts.

CREATE TABLE IF NOT EXISTS playoff_brackets (
  season_id UUID PRIMARY KEY REFERENCES seasons(id) ON DELETE CASCADE,
  sf1_team1 rl_team NOT NULL,
  sf1_team2 rl_team NOT NULL,
  sf2_team1 rl_team NOT NULL,
  sf2_team2 rl_team NOT NULL,
  deadline  TIMESTAMPTZ NOT NULL,
  CONSTRAINT playoff_brackets_distinct_teams CHECK (
    sf1_team1 <> sf1_team2 AND sf2_team1 <> sf2_team2
    AND sf1_team1 NOT IN (sf2_team1, sf2_team2)
    AND sf1_team2 NOT IN (sf2_team1, sf2_team2)
  )
);

ALTER TABLE playoff_brackets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Playoff brackets readable by everyone" ON playoff_brackets;
CREATE POLICY "Playoff brackets readable by everyone"
  ON playoff_brackets FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert playoff brackets" ON playoff_brackets;
CREATE POLICY "Admins can insert playoff brackets"
  ON playoff_brackets FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update playoff brackets" ON playoff_brackets;
CREATE POLICY "Admins can update playoff brackets"
  ON playoff_brackets FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete playoff brackets" ON playoff_brackets;
CREATE POLICY "Admins can delete playoff brackets"
  ON playoff_brackets FOR DELETE
  USING (is_admin());

INSERT INTO playoff_brackets (season_id, sf1_team1, sf1_team2, sf2_team1, sf2_team2, deadline)
SELECT id, 'thor', 'stjarnan', '354esports', 'dusty', '2026-04-26T16:00:00+00:00'
FROM seasons WHERE number = 11
ON CONFLICT (season_id) DO NOTHING;

-- Season 12 (Liquipedia: Icelandic_Esports_League/Season_12). 1st v 4th, 2nd v 3rd.
INSERT INTO playoff_brackets (season_id, sf1_team1, sf1_team2, sf2_team1, sf2_team2, deadline)
SELECT id, '354esports', 'hamar', 'thor', 'omon', '2026-11-14T16:00:00+00:00'
FROM seasons WHERE number = 12
ON CONFLICT (season_id) DO NOTHING;

-- Drop the Season 11-only constraints. gf_winner_is_sf_winner is
-- season-agnostic and stays.
ALTER TABLE playoff_predictions DROP CONSTRAINT IF EXISTS playoff_predictions_sf1_winner_check;
ALTER TABLE playoff_predictions DROP CONSTRAINT IF EXISTS playoff_predictions_sf2_winner_check;
ALTER TABLE playoff_predictions DROP CONSTRAINT IF EXISTS playoff_predictions_gf_winner_check;
ALTER TABLE playoff_predictions DROP CONSTRAINT IF EXISTS playoff_predictions_third_winner_check;
ALTER TABLE playoff_predictions DROP CONSTRAINT IF EXISTS third_winner_is_sf_loser;

CREATE OR REPLACE FUNCTION validate_playoff_prediction()
RETURNS TRIGGER AS $$
DECLARE
  b playoff_brackets%ROWTYPE;
  sf1_loser rl_team;
  sf2_loser rl_team;
BEGIN
  SELECT * INTO b FROM playoff_brackets WHERE season_id = NEW.season_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Predictions are not open for this season';
  END IF;

  IF TG_OP = 'INSERT' AND NOW() > b.deadline THEN
    RAISE EXCEPTION 'Predictions are closed';
  END IF;

  IF NEW.sf1_winner NOT IN (b.sf1_team1, b.sf1_team2) THEN
    RAISE EXCEPTION 'Semifinal 1 winner must be % or %', b.sf1_team1, b.sf1_team2;
  END IF;
  IF NEW.sf2_winner NOT IN (b.sf2_team1, b.sf2_team2) THEN
    RAISE EXCEPTION 'Semifinal 2 winner must be % or %', b.sf2_team1, b.sf2_team2;
  END IF;

  sf1_loser := CASE WHEN NEW.sf1_winner = b.sf1_team1 THEN b.sf1_team2 ELSE b.sf1_team1 END;
  sf2_loser := CASE WHEN NEW.sf2_winner = b.sf2_team1 THEN b.sf2_team2 ELSE b.sf2_team1 END;
  IF NEW.third_winner NOT IN (sf1_loser, sf2_loser) THEN
    RAISE EXCEPTION 'Third place winner must be one of the semifinal losers';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_playoff_prediction ON playoff_predictions;
CREATE TRIGGER validate_playoff_prediction
  BEFORE INSERT OR UPDATE ON playoff_predictions
  FOR EACH ROW EXECUTE FUNCTION validate_playoff_prediction();
