import type { Sf1Team, Sf2Team } from '@/types/predictions';
import { PREDICTIONS_DEADLINE } from './constants';

export function getSf1Loser(winner: Sf1Team | undefined): Sf1Team | undefined {
  if (!winner) return undefined;
  return winner === 'thor' ? 'stjarnan' : 'thor';
}

export function getSf2Loser(winner: Sf2Team | undefined): Sf2Team | undefined {
  if (!winner) return undefined;
  return winner === '354esports' ? 'dusty' : '354esports';
}

export function isDeadlinePassed(now: Date = new Date()): boolean {
  return now.getTime() > new Date(PREDICTIONS_DEADLINE).getTime();
}

export function formatDeadline(): string {
  const d = new Date(PREDICTIONS_DEADLINE);
  return d.toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}
