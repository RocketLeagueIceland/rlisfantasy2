-- Function to swap positions of two players atomically
-- This bypasses the unique role/sub_order triggers by doing a single atomic swap

CREATE OR REPLACE FUNCTION swap_player_positions(
  p_team_id UUID,
  p_player1_id UUID,  -- fantasy_team_players.id
  p_player2_id UUID   -- fantasy_team_players.id
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

  -- Disable triggers temporarily for this transaction
  ALTER TABLE fantasy_team_players DISABLE TRIGGER validate_unique_roles_trigger;
  ALTER TABLE fantasy_team_players DISABLE TRIGGER validate_unique_sub_order_trigger;

  -- Perform the swap
  UPDATE fantasy_team_players
  SET slot_type = v_p2_slot_type, role = v_p2_role, sub_order = v_p2_sub_order
  WHERE id = p_player1_id;

  UPDATE fantasy_team_players
  SET slot_type = v_p1_slot_type, role = v_p1_role, sub_order = v_p1_sub_order
  WHERE id = p_player2_id;

  -- Re-enable triggers
  ALTER TABLE fantasy_team_players ENABLE TRIGGER validate_unique_roles_trigger;
  ALTER TABLE fantasy_team_players ENABLE TRIGGER validate_unique_sub_order_trigger;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION swap_player_positions(UUID, UUID, UUID) TO authenticated;
