import type { RLTeam, User } from './database';

export type SeriesId = 'sf1' | 'sf2' | 'gf' | 'third';

export type SeriesScore = '4-0' | '4-1' | '4-2' | '4-3';

export const SERIES_SCORES = ['4-0', '4-1', '4-2', '4-3'] as const;

/**
 * One season's playoff bracket: the two semifinal pairings (decided by league
 * play) and the submission deadline. The Grand Final is SF1 winner vs SF2
 * winner; the Third Place Match is SF1 loser vs SF2 loser.
 */
export interface PlayoffBracket {
  season: number;
  sf1: readonly [RLTeam, RLTeam];
  sf2: readonly [RLTeam, RLTeam];
  /** ISO timestamp; submissions close at this instant. */
  deadline: string;
}

export interface PlayoffPrediction {
  id: string;
  user_id: string;
  season_id: string;
  sf1_winner: RLTeam;
  sf1_score: SeriesScore;
  sf2_winner: RLTeam;
  sf2_score: SeriesScore;
  gf_winner: RLTeam;
  gf_score: SeriesScore;
  third_winner: RLTeam;
  third_score: SeriesScore;
  created_at: string;
}

export interface PlayoffPredictionWithUser extends PlayoffPrediction {
  user: Pick<User, 'id' | 'username' | 'avatar_url'>;
}
