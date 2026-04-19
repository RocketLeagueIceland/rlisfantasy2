import type { SeriesId, Sf1Team, Sf2Team } from '@/types/predictions';

// Hard deadline for prediction submissions. Iceland is UTC year-round.
export const PREDICTIONS_DEADLINE = '2026-04-26T16:00:00+00:00';

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

export const SF1_TEAMS: readonly [Sf1Team, Sf1Team] = ['thor', 'stjarnan'];
export const SF2_TEAMS: readonly [Sf2Team, Sf2Team] = ['354esports', 'dusty'];
