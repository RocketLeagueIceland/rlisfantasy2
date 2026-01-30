-- Add aliases column to rl_players table
-- Aliases are alternative names that players might use in ballchasing replays

ALTER TABLE rl_players ADD COLUMN aliases TEXT[] DEFAULT '{}';

-- Create an index for faster alias lookups
CREATE INDEX idx_rl_players_aliases ON rl_players USING GIN (aliases);

-- Add a comment to explain the column
COMMENT ON COLUMN rl_players.aliases IS 'Alternative names the player uses in ballchasing replays';
