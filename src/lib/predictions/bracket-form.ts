import { z } from 'zod';
import type { RLTeam } from '@/types/database';
import type {
  PlayoffBracket,
  PlayoffPrediction,
  SeriesScore,
} from '@/types/predictions';
import type { PredictionSubmission } from './schema';
import { getOpponent } from './helpers';

// Each cell is the number of games a team won in that series (0–4 for a BO7).
// Exactly one team in each pair must reach 4 for the series to be valid.
const gameCount = z.number().int().min(0).max(4);

export const bracketFormSchema = z
  .object({
    sf1_a: gameCount, // bracket.sf1[0]
    sf1_b: gameCount, // bracket.sf1[1]
    sf2_a: gameCount, // bracket.sf2[0]
    sf2_b: gameCount, // bracket.sf2[1]
    gf_a: gameCount, // sf1 winner
    gf_b: gameCount, // sf2 winner
    third_a: gameCount, // sf1 loser
    third_b: gameCount, // sf2 loser
  })
  .superRefine((d, ctx) => {
    const pairs: ReadonlyArray<readonly [keyof BracketFormValues, keyof BracketFormValues]> = [
      ['sf1_a', 'sf1_b'],
      ['sf2_a', 'sf2_b'],
      ['gf_a', 'gf_b'],
      ['third_a', 'third_b'],
    ];
    for (const [a, b] of pairs) {
      const va = d[a];
      const vb = d[b];
      const aWins = va === 4;
      const bWins = vb === 4;
      if (!aWins && !bWins) {
        ctx.addIssue({
          code: 'custom',
          path: [a],
          message: 'One team must reach 4 games to win the series',
        });
      } else if (aWins && bWins) {
        ctx.addIssue({
          code: 'custom',
          path: [b],
          message: 'Only one team can reach 4 games',
        });
      }
    }
  });

export type BracketFormValues = z.infer<typeof bracketFormSchema>;

export function emptyBracketFormValues(): Partial<BracketFormValues> {
  return {};
}

export function deriveSf1Winner(
  bracket: PlayoffBracket,
  v: Pick<Partial<BracketFormValues>, 'sf1_a' | 'sf1_b'>
): RLTeam | undefined {
  if (v.sf1_a === 4 && v.sf1_b !== 4) return bracket.sf1[0];
  if (v.sf1_b === 4 && v.sf1_a !== 4) return bracket.sf1[1];
  return undefined;
}

export function deriveSf2Winner(
  bracket: PlayoffBracket,
  v: Pick<Partial<BracketFormValues>, 'sf2_a' | 'sf2_b'>
): RLTeam | undefined {
  if (v.sf2_a === 4 && v.sf2_b !== 4) return bracket.sf2[0];
  if (v.sf2_b === 4 && v.sf2_a !== 4) return bracket.sf2[1];
  return undefined;
}

function toScore(winnerGames: number, loserGames: number): SeriesScore {
  if (winnerGames !== 4) throw new Error('winner must have 4 games');
  return `4-${loserGames}` as SeriesScore;
}

/**
 * Transform a fully-filled bracket form into a PredictionSubmission suitable
 * for POST /api/predictions. Throws if the bracket isn't valid.
 */
export function toPredictionSubmission(
  bracket: PlayoffBracket,
  v: BracketFormValues
): PredictionSubmission {
  const sf1Winner = deriveSf1Winner(bracket, v);
  const sf2Winner = deriveSf2Winner(bracket, v);
  if (!sf1Winner || !sf2Winner) {
    throw new Error('Invalid bracket: semifinals are not complete');
  }

  const sf1Score =
    v.sf1_a === 4 ? toScore(v.sf1_a, v.sf1_b) : toScore(v.sf1_b, v.sf1_a);
  const sf2Score =
    v.sf2_a === 4 ? toScore(v.sf2_a, v.sf2_b) : toScore(v.sf2_b, v.sf2_a);

  const gfWinner: RLTeam = v.gf_a === 4 ? sf1Winner : sf2Winner;
  const gfScore =
    v.gf_a === 4 ? toScore(v.gf_a, v.gf_b) : toScore(v.gf_b, v.gf_a);

  const sf1Loser = getOpponent(bracket.sf1, sf1Winner)!;
  const sf2Loser = getOpponent(bracket.sf2, sf2Winner)!;
  const thirdWinner: RLTeam = v.third_a === 4 ? sf1Loser : sf2Loser;
  const thirdScore =
    v.third_a === 4
      ? toScore(v.third_a, v.third_b)
      : toScore(v.third_b, v.third_a);

  return {
    sf1_winner: sf1Winner,
    sf1_score: sf1Score,
    sf2_winner: sf2Winner,
    sf2_score: sf2Score,
    gf_winner: gfWinner,
    gf_score: gfScore,
    third_winner: thirdWinner,
    third_score: thirdScore,
  };
}

/** Build a synthetic PlayoffPrediction for live preview (confirm dialog). */
export function previewPrediction(
  bracket: PlayoffBracket,
  v: BracketFormValues
): PlayoffPrediction {
  const submission = toPredictionSubmission(bracket, v);
  return {
    id: 'preview',
    user_id: 'preview',
    season_id: 'preview',
    created_at: new Date().toISOString(),
    ...submission,
  };
}
