-- Season 12: Stjarnan left the league, Flux joined.
-- Enum values can't be removed, so 'stjarnan' stays for Season 11 history;
-- 'flux' is added for the new season's rosters.
ALTER TYPE rl_team ADD VALUE IF NOT EXISTS 'flux';
