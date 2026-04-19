-- Playoff Predictions — one immutable bracket prediction per user for the RLIS playoffs.
-- Bracket (hardcoded, one-off):
--   SF1: thor vs stjarnan
--   SF2: 354esports vs dusty
--   Grand Final: SF1 winner vs SF2 winner
--   Third Place: SF1 loser vs SF2 loser

CREATE TYPE series_score AS ENUM ('4-0', '4-1', '4-2', '4-3');

CREATE TABLE playoff_predictions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  sf1_winner   rl_team NOT NULL CHECK (sf1_winner IN ('thor', 'stjarnan')),
  sf1_score    series_score NOT NULL,

  sf2_winner   rl_team NOT NULL CHECK (sf2_winner IN ('354esports', 'dusty')),
  sf2_score    series_score NOT NULL,

  gf_winner    rl_team NOT NULL CHECK (gf_winner IN ('thor', 'stjarnan', '354esports', 'dusty')),
  gf_score     series_score NOT NULL,

  third_winner rl_team NOT NULL CHECK (third_winner IN ('thor', 'stjarnan', '354esports', 'dusty')),
  third_score  series_score NOT NULL,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT playoff_predictions_user_unique UNIQUE (user_id),

  CONSTRAINT gf_winner_is_sf_winner CHECK (
    gf_winner = sf1_winner OR gf_winner = sf2_winner
  ),

  CONSTRAINT third_winner_is_sf_loser CHECK (
    (third_winner IN ('thor', 'stjarnan')     AND third_winner <> sf1_winner) OR
    (third_winner IN ('354esports', 'dusty')  AND third_winner <> sf2_winner)
  )
);

CREATE INDEX idx_playoff_predictions_created_at ON playoff_predictions(created_at);
CREATE INDEX idx_playoff_predictions_user_id    ON playoff_predictions(user_id);

ALTER TABLE playoff_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictions readable by authenticated users"
  ON playoff_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own prediction"
  ON playoff_predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any prediction"
  ON playoff_predictions FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete predictions"
  ON playoff_predictions FOR DELETE
  USING (is_admin());
