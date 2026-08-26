-- Enforce the transfer deadline for real.
-- Season 11 data showed 14 of 55 transfers were made AFTER the displayed
-- "transfers close" time, because the deadline was display-only and the
-- window boolean was toggled by hand. From now on the deadline itself
-- rejects transfers: a transfer is only valid while the window is open AND
-- now() is before transfer_window_closes_at (when set). The admin toggle
-- remains as the way to open the window / close it early.
CREATE OR REPLACE FUNCTION validate_transfer()
RETURNS TRIGGER AS $$
DECLARE
  window_open BOOLEAN;
  closes_at TIMESTAMPTZ;
  week_season UUID;
  existing_transfer UUID;
BEGIN
  SELECT transfer_window_open, transfer_window_closes_at, season_id
  INTO window_open, closes_at, week_season
  FROM weeks
  WHERE id = NEW.week_id;

  IF week_season IS NULL OR week_season IS DISTINCT FROM current_season_id() THEN
    RAISE EXCEPTION 'Transfers are only allowed for the current season';
  END IF;

  IF NOT window_open THEN
    RAISE EXCEPTION 'Transfer window is not open for this week';
  END IF;

  IF closes_at IS NOT NULL AND NOW() > closes_at THEN
    RAISE EXCEPTION 'Transfer window has closed for this week';
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
