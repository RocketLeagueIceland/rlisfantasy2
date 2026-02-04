-- Fix validate_team_size trigger to also skip during swaps

CREATE OR REPLACE FUNCTION validate_team_size()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
  active_count INTEGER;
  sub_count INTEGER;
BEGIN
  -- Skip validation if we're in a swap operation
  IF current_setting('app.swapping', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count total players
  SELECT COUNT(*) INTO player_count
  FROM fantasy_team_players
  WHERE fantasy_team_id = COALESCE(NEW.fantasy_team_id, OLD.fantasy_team_id);

  -- Count active players
  SELECT COUNT(*) INTO active_count
  FROM fantasy_team_players
  WHERE fantasy_team_id = COALESCE(NEW.fantasy_team_id, OLD.fantasy_team_id)
    AND slot_type = 'active';

  -- Count substitutes
  SELECT COUNT(*) INTO sub_count
  FROM fantasy_team_players
  WHERE fantasy_team_id = COALESCE(NEW.fantasy_team_id, OLD.fantasy_team_id)
    AND slot_type = 'substitute';

  -- Allow partial teams during creation, but validate when complete
  IF player_count > 6 THEN
    RAISE EXCEPTION 'Fantasy team cannot have more than 6 players';
  END IF;

  IF active_count > 3 THEN
    RAISE EXCEPTION 'Fantasy team cannot have more than 3 active players';
  END IF;

  IF sub_count > 3 THEN
    RAISE EXCEPTION 'Fantasy team cannot have more than 3 substitutes';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
