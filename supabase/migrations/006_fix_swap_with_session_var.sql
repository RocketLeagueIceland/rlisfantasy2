-- Fix for player position swapping (v2)
-- The previous approach (DISABLE TRIGGER) requires superuser privileges
-- Instead, we use session variables to signal triggers to skip validation during swaps

-- Update the unique roles trigger to skip during swaps
CREATE OR REPLACE FUNCTION validate_unique_roles()
RETURNS TRIGGER AS $$
DECLARE
  existing_role player_role;
BEGIN
  -- Skip validation if we're in a swap operation
  IF current_setting('app.swapping', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.slot_type = 'active' AND NEW.role IS NOT NULL THEN
    SELECT role INTO existing_role
    FROM fantasy_team_players
    WHERE fantasy_team_id = NEW.fantasy_team_id
      AND slot_type = 'active'
      AND role = NEW.role
      AND id != COALESCE(NEW.id, uuid_generate_v4());

    IF existing_role IS NOT NULL THEN
      RAISE EXCEPTION 'Team already has a player in the % role', NEW.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the unique sub_order trigger to skip during swaps
CREATE OR REPLACE FUNCTION validate_unique_sub_order()
RETURNS TRIGGER AS $$
DECLARE
  existing_order INTEGER;
BEGIN
  -- Skip validation if we're in a swap operation
  IF current_setting('app.swapping', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.slot_type = 'substitute' AND NEW.sub_order IS NOT NULL THEN
    SELECT sub_order INTO existing_order
    FROM fantasy_team_players
    WHERE fantasy_team_id = NEW.fantasy_team_id
      AND slot_type = 'substitute'
      AND sub_order = NEW.sub_order
      AND id != COALESCE(NEW.id, uuid_generate_v4());

    IF existing_order IS NOT NULL THEN
      RAISE EXCEPTION 'Team already has a substitute in position %', NEW.sub_order;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the swap function with session variable approach
DROP FUNCTION IF EXISTS swap_player_positions(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION swap_player_positions(
  p_team_id UUID,
  p_player1_id UUID,
  p_player2_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_p1_slot_type slot_type;
  v_p1_role player_role;
  v_p1_sub_order INTEGER;
  v_p2_slot_type slot_type;
  v_p2_role player_role;
  v_p2_sub_order INTEGER;
BEGIN
  -- Get player 1's current position
  SELECT slot_type, role, sub_order
  INTO v_p1_slot_type, v_p1_role, v_p1_sub_order
  FROM fantasy_team_players
  WHERE id = p_player1_id AND fantasy_team_id = p_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player 1 not found on team';
  END IF;

  -- Get player 2's current position
  SELECT slot_type, role, sub_order
  INTO v_p2_slot_type, v_p2_role, v_p2_sub_order
  FROM fantasy_team_players
  WHERE id = p_player2_id AND fantasy_team_id = p_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player 2 not found on team';
  END IF;

  -- Set session variable to signal triggers to skip validation
  PERFORM set_config('app.swapping', 'true', true);

  -- Perform the swap
  UPDATE fantasy_team_players
  SET slot_type = v_p2_slot_type, role = v_p2_role, sub_order = v_p2_sub_order
  WHERE id = p_player1_id;

  UPDATE fantasy_team_players
  SET slot_type = v_p1_slot_type, role = v_p1_role, sub_order = v_p1_sub_order
  WHERE id = p_player2_id;

  -- Reset session variable
  PERFORM set_config('app.swapping', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION swap_player_positions(UUID, UUID, UUID) TO authenticated;
