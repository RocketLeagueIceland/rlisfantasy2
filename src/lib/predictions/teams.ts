import type { RLTeam } from '@/types/database';

// Every rl_team enum value, including past seasons' teams (zod needs a tuple).
export const RL_TEAMS_ALL = [
  '354esports',
  'dusty',
  'flux',
  'hamar',
  'omon',
  'stjarnan',
  'thor',
] as const satisfies readonly RLTeam[];
