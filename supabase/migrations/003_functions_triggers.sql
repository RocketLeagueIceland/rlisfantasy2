-- Functions and Triggers for RLIS Fantasy League

-- ============ USER CREATION TRIGGER ============
-- Automatically create a user profile when someone signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'preferred_username',  -- Discord username
      NEW.raw_user_meta_data->>'name',                -- Google name
      NEW.raw_user_meta_data->>'full_name',           -- Alternative
      split_part(NEW.email, '@', 1)                   -- Fallback to email prefix
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',          -- Discord/Google avatar
      NEW.raw_user_meta_data->>'picture'              -- Alternative Google avatar
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ TRANSFER WINDOW AUTO-CLOSE ============
-- Function to check if transfer window should be closed
CREATE OR REPLACE FUNCTION check_transfer_window()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-close transfer window 1 hour before broadcast
  IF NEW.broadcast_starts_at IS NOT NULL AND
     NEW.transfer_window_closes_at IS NULL THEN
    NEW.transfer_window_closes_at := NEW.broadcast_starts_at - INTERVAL '1 hour';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transfer_window_close
  BEFORE INSERT OR UPDATE ON weeks
  FOR EACH ROW EXECUTE FUNCTION check_transfer_window();

-- ============ VALIDATE FANTASY TEAM SIZE ============
-- Ensure teams have exactly 6 players
CREATE OR REPLACE FUNCTION validate_team_size()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
  active_count INTEGER;
  sub_count INTEGER;
BEGIN
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

CREATE TRIGGER validate_team_size_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fantasy_team_players
  FOR EACH ROW EXECUTE FUNCTION validate_team_size();

-- ============ VALIDATE UNIQUE ROLES ============
-- Ensure each active role is unique per team
CREATE OR REPLACE FUNCTION validate_unique_roles()
RETURNS TRIGGER AS $$
DECLARE
  existing_role player_role;
BEGIN
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

CREATE TRIGGER validate_unique_roles_trigger
  BEFORE INSERT OR UPDATE ON fantasy_team_players
  FOR EACH ROW EXECUTE FUNCTION validate_unique_roles();

-- ============ VALIDATE UNIQUE SUB ORDER ============
-- Ensure sub_order 1, 2, 3 are unique per team
CREATE OR REPLACE FUNCTION validate_unique_sub_order()
RETURNS TRIGGER AS $$
DECLARE
  existing_order INTEGER;
BEGIN
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

CREATE TRIGGER validate_unique_sub_order_trigger
  BEFORE INSERT OR UPDATE ON fantasy_team_players
  FOR EACH ROW EXECUTE FUNCTION validate_unique_sub_order();

-- ============ TRANSFER VALIDATION ============
-- Validate transfer (one per team per week, window must be open)
CREATE OR REPLACE FUNCTION validate_transfer()
RETURNS TRIGGER AS $$
DECLARE
  window_open BOOLEAN;
  existing_transfer UUID;
BEGIN
  -- Check if transfer window is open
  SELECT transfer_window_open INTO window_open
  FROM weeks
  WHERE id = NEW.week_id;

  IF NOT window_open THEN
    RAISE EXCEPTION 'Transfer window is not open for this week';
  END IF;

  -- Check for existing transfer this week
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

CREATE TRIGGER validate_transfer_trigger
  BEFORE INSERT ON transfers
  FOR EACH ROW EXECUTE FUNCTION validate_transfer();

-- ============ SCOREBOARD VIEW ============
-- Materialized view for efficient scoreboard queries
CREATE OR REPLACE VIEW scoreboard_view AS
SELECT
  u.id as user_id,
  u.username,
  u.avatar_url,
  ft.id as team_id,
  ft.name as team_name,
  COALESCE(SUM(ws.total_points), 0) as total_points,
  RANK() OVER (ORDER BY COALESCE(SUM(ws.total_points), 0) DESC) as rank
FROM users u
JOIN fantasy_teams ft ON ft.user_id = u.id
LEFT JOIN weekly_scores ws ON ws.fantasy_team_id = ft.id
LEFT JOIN weeks w ON w.id = ws.week_id AND w.scores_published = true
GROUP BY u.id, u.username, u.avatar_url, ft.id, ft.name
ORDER BY total_points DESC;

-- ============ HELPER FUNCTION: GET CURRENT WEEK ============
CREATE OR REPLACE FUNCTION get_current_week()
RETURNS TABLE (
  id UUID,
  week_number INTEGER,
  transfer_window_open BOOLEAN,
  transfer_window_closes_at TIMESTAMPTZ,
  broadcast_starts_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.week_number, w.transfer_window_open,
         w.transfer_window_closes_at, w.broadcast_starts_at
  FROM weeks w
  ORDER BY w.week_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============ HELPER FUNCTION: CHECK TRANSFER ELIGIBILITY ============
CREATE OR REPLACE FUNCTION can_make_transfer(team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_week_id UUID;
  window_open BOOLEAN;
  has_transfer BOOLEAN;
BEGIN
  -- Get current week with open transfer window
  SELECT w.id, w.transfer_window_open INTO current_week_id, window_open
  FROM weeks w
  WHERE w.transfer_window_open = true
  ORDER BY w.week_number DESC
  LIMIT 1;

  IF current_week_id IS NULL OR NOT window_open THEN
    RETURN FALSE;
  END IF;

  -- Check if already made transfer
  SELECT EXISTS (
    SELECT 1 FROM transfers
    WHERE fantasy_team_id = team_id AND week_id = current_week_id
  ) INTO has_transfer;

  RETURN NOT has_transfer;
END;
$$ LANGUAGE plpgsql;
