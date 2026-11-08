import type { PlayoffBracket, SeriesId } from '@/types/predictions';

// Per-season playoff brackets. When a season's semifinal pairings are known
// (end of league play), add an entry here AND a matching row in the
// playoff_brackets table (see supabase/migrations/016_*), and predictions
// open for that season. Iceland is UTC year-round.
export const PLAYOFF_BRACKETS: Record<number, PlayoffBracket> = {
  11: {
    season: 11,
    sf1: ['thor', 'stjarnan'],
    sf2: ['354esports', 'dusty'],
    deadline: '2026-04-26T16:00:00+00:00',
  },
  // Liquipedia: Icelandic_Esports_League/Season_12 — 1st vs 4th, 2nd vs 3rd,
  // all series Bo7, played 2026-11-14.
  12: {
    season: 12,
    sf1: ['354esports', 'hamar'],
    sf2: ['thor', 'omon'],
    deadline: '2026-11-14T16:00:00+00:00',
  },
};

export function getPlayoffBracket(
  seasonNumber: number | null | undefined
): PlayoffBracket | null {
  if (seasonNumber == null) return null;
  return PLAYOFF_BRACKETS[seasonNumber] ?? null;
}

export interface SeriesConfig {
  id: SeriesId;
  label: string;
  shortLabel: string;
}

export const SERIES: Record<SeriesId, SeriesConfig> = {
  sf1:   { id: 'sf1',   label: 'Semifinal 1',       shortLabel: 'SF 1' },
  sf2:   { id: 'sf2',   label: 'Semifinal 2',       shortLabel: 'SF 2' },
  gf:    { id: 'gf',    label: 'Grand Final',       shortLabel: 'Final' },
  third: { id: 'third', label: 'Third Place Match', shortLabel: '3rd' },
};
