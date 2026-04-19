import { z } from 'zod';
import { SEMIFINAL_TEAMS, SERIES_SCORES } from '@/types/predictions';

const score = z.enum(SERIES_SCORES);

const allPlayoffTeams = [
  ...SEMIFINAL_TEAMS.sf1,
  ...SEMIFINAL_TEAMS.sf2,
] as const;

export const predictionSchema = z
  .object({
    sf1_winner: z.enum(SEMIFINAL_TEAMS.sf1),
    sf1_score: score,
    sf2_winner: z.enum(SEMIFINAL_TEAMS.sf2),
    sf2_score: score,
    gf_winner: z.enum(allPlayoffTeams),
    gf_score: score,
    third_winner: z.enum(allPlayoffTeams),
    third_score: score,
  })
  .superRefine((d, ctx) => {
    if (d.gf_winner !== d.sf1_winner && d.gf_winner !== d.sf2_winner) {
      ctx.addIssue({
        code: 'custom',
        path: ['gf_winner'],
        message: 'Grand Final winner must be one of the semifinal winners',
      });
    }
    const sf1Loser = d.sf1_winner === 'thor' ? 'stjarnan' : 'thor';
    const sf2Loser = d.sf2_winner === '354esports' ? 'dusty' : '354esports';
    if (d.third_winner !== sf1Loser && d.third_winner !== sf2Loser) {
      ctx.addIssue({
        code: 'custom',
        path: ['third_winner'],
        message: 'Third place winner must be one of the semifinal losers',
      });
    }
  });

export type PredictionSubmission = z.infer<typeof predictionSchema>;
