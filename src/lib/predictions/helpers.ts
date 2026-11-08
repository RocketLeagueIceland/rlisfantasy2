import type { RLTeam } from '@/types/database';
import type { PlayoffBracket } from '@/types/predictions';

/** The other team in a semifinal pairing, i.e. the loser if `winner` won. */
export function getOpponent(
  pair: readonly [RLTeam, RLTeam],
  winner: RLTeam | undefined
): RLTeam | undefined {
  if (!winner) return undefined;
  if (winner === pair[0]) return pair[1];
  if (winner === pair[1]) return pair[0];
  return undefined;
}

export function isDeadlinePassed(
  bracket: PlayoffBracket,
  now: Date = new Date()
): boolean {
  return now.getTime() > new Date(bracket.deadline).getTime();
}

export function formatDeadline(bracket: PlayoffBracket): string {
  const d = new Date(bracket.deadline);
  return d.toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}
