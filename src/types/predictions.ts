import type { RLTeam, User } from './database';

export type SeriesId = 'sf1' | 'sf2' | 'gf' | 'third';

export type SeriesScore = '4-0' | '4-1' | '4-2' | '4-3';

export const SERIES_SCORES = ['4-0', '4-1', '4-2', '4-3'] as const;

export const SEMIFINAL_TEAMS = {
  sf1: ['thor', 'stjarnan'] as const,
  sf2: ['354esports', 'dusty'] as const,
} satisfies Record<'sf1' | 'sf2', readonly RLTeam[]>;

export type Sf1Team = (typeof SEMIFINAL_TEAMS)['sf1'][number];
export type Sf2Team = (typeof SEMIFINAL_TEAMS)['sf2'][number];
export type PlayoffTeam = Sf1Team | Sf2Team;

export interface PlayoffPrediction {
  id: string;
  user_id: string;
  sf1_winner: Sf1Team;
  sf1_score: SeriesScore;
  sf2_winner: Sf2Team;
  sf2_score: SeriesScore;
  gf_winner: PlayoffTeam;
  gf_score: SeriesScore;
  third_winner: PlayoffTeam;
  third_score: SeriesScore;
  created_at: string;
}

export interface PlayoffPredictionWithUser extends PlayoffPrediction {
  user: Pick<User, 'id' | 'username' | 'avatar_url'>;
}
