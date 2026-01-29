-- RLIS Fantasy League Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE rl_team AS ENUM ('354esports', 'dusty', 'hamar', 'omon', 'thor', 'stjarnan');
CREATE TYPE player_role AS ENUM ('striker', 'midfield', 'goalkeeper');
CREATE TYPE slot_type AS ENUM ('active', 'substitute');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RL Players table
CREATE TABLE rl_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  team rl_team NOT NULL,
  price INTEGER NOT NULL DEFAULT 1000000,
  ballchasing_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fantasy Teams table
CREATE TABLE fantasy_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_remaining INTEGER NOT NULL DEFAULT 10000000,
  created_in_week INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One team per user
);

-- Fantasy Team Players junction table
CREATE TABLE fantasy_team_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  rl_player_id UUID NOT NULL REFERENCES rl_players(id) ON DELETE RESTRICT,
  slot_type slot_type NOT NULL,
  role player_role, -- Only for active players
  sub_order INTEGER, -- 1, 2, or 3 for substitutes
  purchase_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fantasy_team_id, rl_player_id), -- Can't have same player twice
  CONSTRAINT valid_active CHECK (
    (slot_type = 'active' AND role IS NOT NULL AND sub_order IS NULL) OR
    (slot_type = 'substitute' AND role IS NULL AND sub_order IS NOT NULL AND sub_order BETWEEN 1 AND 3)
  )
);

-- Weeks table
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INTEGER NOT NULL UNIQUE,
  transfer_window_open BOOLEAN DEFAULT FALSE,
  transfer_window_closes_at TIMESTAMPTZ,
  broadcast_starts_at TIMESTAMPTZ,
  stats_fetched BOOLEAN DEFAULT FALSE,
  scores_published BOOLEAN DEFAULT FALSE,
  ballchasing_group_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Stats per week
CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  rl_player_id UUID NOT NULL REFERENCES rl_players(id) ON DELETE CASCADE,
  games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played BETWEEN 0 AND 5),
  total_goals INTEGER NOT NULL DEFAULT 0,
  total_assists INTEGER NOT NULL DEFAULT 0,
  total_saves INTEGER NOT NULL DEFAULT 0,
  total_shots INTEGER NOT NULL DEFAULT 0,
  total_demos_received INTEGER NOT NULL DEFAULT 0,
  per_game_stats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, rl_player_id)
);

-- Weekly Scores per fantasy team
CREATE TABLE weekly_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  breakdown JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, fantasy_team_id)
);

-- Transfers table
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  sold_player_id UUID NOT NULL REFERENCES rl_players(id) ON DELETE RESTRICT,
  sold_price INTEGER NOT NULL,
  bought_player_id UUID NOT NULL REFERENCES rl_players(id) ON DELETE RESTRICT,
  bought_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fantasy_team_id, week_id) -- One transfer per team per week
);

-- Create indexes for performance
CREATE INDEX idx_fantasy_teams_user_id ON fantasy_teams(user_id);
CREATE INDEX idx_fantasy_team_players_team_id ON fantasy_team_players(fantasy_team_id);
CREATE INDEX idx_fantasy_team_players_player_id ON fantasy_team_players(rl_player_id);
CREATE INDEX idx_player_stats_week_id ON player_stats(week_id);
CREATE INDEX idx_player_stats_player_id ON player_stats(rl_player_id);
CREATE INDEX idx_weekly_scores_week_id ON weekly_scores(week_id);
CREATE INDEX idx_weekly_scores_team_id ON weekly_scores(fantasy_team_id);
CREATE INDEX idx_transfers_team_id ON transfers(fantasy_team_id);
CREATE INDEX idx_transfers_week_id ON transfers(week_id);
CREATE INDEX idx_rl_players_team ON rl_players(team);
CREATE INDEX idx_weeks_week_number ON weeks(week_number);
