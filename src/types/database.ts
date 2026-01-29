export type RLTeam = '354esports' | 'dusty' | 'hamar' | 'omon' | 'thor' | 'stjarnan';

export type Role = 'striker' | 'midfield' | 'goalkeeper';

export type SlotType = 'active' | 'substitute';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface RLPlayer {
  id: string;
  name: string;
  team: RLTeam;
  price: number;
  ballchasing_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FantasyTeam {
  id: string;
  user_id: string;
  name: string;
  budget_remaining: number;
  created_in_week: number;
  created_at: string;
}

export interface FantasyTeamPlayer {
  id: string;
  fantasy_team_id: string;
  rl_player_id: string;
  slot_type: SlotType;
  role: Role | null; // Only for active players
  sub_order: number | null; // 1, 2, or 3 for substitutes
  purchase_price: number;
  created_at: string;
  // Joined data
  rl_player?: RLPlayer;
}

export interface Week {
  id: string;
  week_number: number;
  transfer_window_open: boolean;
  transfer_window_closes_at: string | null;
  broadcast_starts_at: string | null;
  stats_fetched: boolean;
  scores_published: boolean;
  ballchasing_group_id: string | null;
  created_at: string;
}

export interface PerGameStats {
  game_number: number;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  demos_received: number;
}

export interface PlayerStats {
  id: string;
  week_id: string;
  rl_player_id: string;
  games_played: number; // 0-5
  total_goals: number;
  total_assists: number;
  total_saves: number;
  total_shots: number;
  total_demos_received: number;
  per_game_stats: PerGameStats[];
  created_at: string;
  // Joined data
  rl_player?: RLPlayer;
}

export interface PointsBreakdown {
  player_id: string;
  player_name: string;
  role: Role;
  games_used: number;
  base_points: number;
  role_bonus: number;
  total_points: number;
  stats: {
    goals: number;
    assists: number;
    saves: number;
    shots: number;
    demos_received: number;
  };
  substitutions?: {
    sub_player_id: string;
    sub_player_name: string;
    games_filled: number;
    points_earned: number;
  }[];
}

export interface WeeklyScore {
  id: string;
  week_id: string;
  fantasy_team_id: string;
  total_points: number;
  breakdown: PointsBreakdown[];
  created_at: string;
  // Joined data
  fantasy_team?: FantasyTeam;
  week?: Week;
  user?: User;
}

export interface Transfer {
  id: string;
  fantasy_team_id: string;
  week_id: string;
  sold_player_id: string;
  sold_price: number;
  bought_player_id: string;
  bought_price: number;
  created_at: string;
  // Joined data
  sold_player?: RLPlayer;
  bought_player?: RLPlayer;
}

// Scoreboard entry for display
export interface ScoreboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  team_name: string;
  total_points: number;
  weekly_points: { week_number: number; points: number }[];
}

// Fantasy team with players for display
export interface FantasyTeamWithPlayers extends FantasyTeam {
  players: FantasyTeamPlayer[];
  user?: User;
}

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      rl_players: {
        Row: RLPlayer;
        Insert: Omit<RLPlayer, 'id' | 'created_at'>;
        Update: Partial<Omit<RLPlayer, 'id' | 'created_at'>>;
      };
      fantasy_teams: {
        Row: FantasyTeam;
        Insert: Omit<FantasyTeam, 'id' | 'created_at'>;
        Update: Partial<Omit<FantasyTeam, 'id' | 'created_at'>>;
      };
      fantasy_team_players: {
        Row: FantasyTeamPlayer;
        Insert: Omit<FantasyTeamPlayer, 'id' | 'created_at'>;
        Update: Partial<Omit<FantasyTeamPlayer, 'id' | 'created_at'>>;
      };
      weeks: {
        Row: Week;
        Insert: Omit<Week, 'id' | 'created_at'>;
        Update: Partial<Omit<Week, 'id' | 'created_at'>>;
      };
      player_stats: {
        Row: PlayerStats;
        Insert: Omit<PlayerStats, 'id' | 'created_at'>;
        Update: Partial<Omit<PlayerStats, 'id' | 'created_at'>>;
      };
      weekly_scores: {
        Row: WeeklyScore;
        Insert: Omit<WeeklyScore, 'id' | 'created_at'>;
        Update: Partial<Omit<WeeklyScore, 'id' | 'created_at'>>;
      };
      transfers: {
        Row: Transfer;
        Insert: Omit<Transfer, 'id' | 'created_at'>;
        Update: Partial<Omit<Transfer, 'id' | 'created_at'>>;
      };
    };
  };
}
