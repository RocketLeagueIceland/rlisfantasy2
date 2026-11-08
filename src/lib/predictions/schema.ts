import { z } from 'zod';
import { RL_TEAMS_ALL } from '@/lib/predictions/teams';
import { SERIES_SCORES, type PlayoffBracket } from '@/types/predictions';
import { getOpponent } from './helpers';

const score = z.enum(SERIES_SCORES);
const team = z.enum(RL_TEAMS_ALL);

const submissionShape = z.object({
  sf1_winner: team,
  sf1_score: score,
  sf2_winner: team,
  sf2_score: score,
  gf_winner: team,
  gf_score: score,
  third_winner: team,
  third_score: score,
});

export type PredictionSubmission = z.infer<typeof submissionShape>;

/** Validates a submission against one season's bracket. */
export function predictionSchema(bracket: PlayoffBracket) {
  return submissionShape.superRefine((d, ctx) => {
    if (!bracket.sf1.includes(d.sf1_winner)) {
      ctx.addIssue({ code: 'custom', path: ['sf1_winner'], message: 'Not a Semifinal 1 team' });
    }
    if (!bracket.sf2.includes(d.sf2_winner)) {
      ctx.addIssue({ code: 'custom', path: ['sf2_winner'], message: 'Not a Semifinal 2 team' });
    }
    if (d.gf_winner !== d.sf1_winner && d.gf_winner !== d.sf2_winner) {
      ctx.addIssue({
        code: 'custom',
        path: ['gf_winner'],
        message: 'Grand Final winner must be one of the semifinal winners',
      });
    }
    const sf1Loser = getOpponent(bracket.sf1, d.sf1_winner);
    const sf2Loser = getOpponent(bracket.sf2, d.sf2_winner);
    if (d.third_winner !== sf1Loser && d.third_winner !== sf2Loser) {
      ctx.addIssue({
        code: 'custom',
        path: ['third_winner'],
        message: 'Third place winner must be one of the semifinal losers',
      });
    }
  });
}
