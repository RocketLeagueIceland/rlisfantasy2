import type { Role } from '@/types';

// Base points for each stat
export const BASE_POINTS = {
  goal: 50,
  assist: 35,
  save: 25,
  shot: 15,
  demo_received: -15,
} as const;

// Role bonus multipliers (2x = double points)
export const ROLE_MULTIPLIERS: Record<Role, Record<string, number>> = {
  striker: {
    goal: 2,      // 2x for goals
    assist: 1,
    save: 1,
    shot: 1,
    demo_received: 1,
  },
  midfield: {
    goal: 1,
    assist: 2,    // 2x for assists
    save: 1,
    shot: 1,
    demo_received: 1,
  },
  goalkeeper: {
    goal: 1,
    assist: 1,
    save: 2,      // 2x for saves
    shot: 1,
    demo_received: 1,
  },
} as const;

// Initial budget for fantasy teams
export const INITIAL_BUDGET = 10_000_000;

// Number of games in a Bo5 series
export const GAMES_IN_SERIES = 5;

// Team size constraints
export const TEAM_SIZE = {
  total: 6,
  active: 3,
  substitutes: 3,
} as const;

// RL Teams
export const RL_TEAMS = [
  '354esports',
  'dusty',
  'hamar',
  'omon',
  'thor',
  'stjarnan',
] as const;

// Team display names (for UI)
export const RL_TEAM_NAMES: Record<string, string> = {
  '354esports': '354 Esports',
  'dusty': 'Dusty',
  'hamar': 'Hamar',
  'omon': 'Ómon',
  'thor': 'Thor',
  'stjarnan': 'Stjarnan',
} as const;

// Role display info
export const ROLE_INFO: Record<Role, { name: string; icon: string; description: string }> = {
  striker: {
    name: 'Striker',
    icon: '/striker.png',
    description: '2x points for goals',
  },
  midfield: {
    name: 'Midfield',
    icon: '/midfield.png',
    description: '2x points for assists',
  },
  goalkeeper: {
    name: 'Goalkeeper',
    icon: '/goalkeeper.png',
    description: '2x points for saves',
  },
} as const;
