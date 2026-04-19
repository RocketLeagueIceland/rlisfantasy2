'use client';

import Image from 'next/image';
import { useFormContext } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RL_TEAM_NAMES } from '@/lib/scoring/constants';
import { SERIES, SF1_TEAMS, SF2_TEAMS } from '@/lib/predictions/constants';
import { getSf1Loser, getSf2Loser } from '@/lib/predictions/helpers';
import { SERIES_SCORES } from '@/types/predictions';
import type {
  PlayoffPrediction,
  PlayoffTeam,
  SeriesScore,
  Sf1Team,
  Sf2Team,
} from '@/types/predictions';
import type { PredictionSubmission } from '@/lib/predictions/schema';

type BracketProps =
  | { mode: 'view'; prediction: PlayoffPrediction; highlight?: boolean }
  | { mode: 'form' };

export function PredictionBracket(props: BracketProps) {
  if (props.mode === 'view') {
    return (
      <div
        className={
          'grid grid-cols-1 gap-4 md:grid-cols-2 ' +
          (props.highlight ? 'ring-2 ring-primary/60 rounded-lg p-2' : '')
        }
      >
        <div className="flex flex-col gap-4">
          <ColumnLabel>Semifinals</ColumnLabel>
          <ViewSeriesBox
            label={SERIES.sf1.label}
            teamA="thor"
            teamB="stjarnan"
            winner={props.prediction.sf1_winner}
            score={props.prediction.sf1_score}
          />
          <ViewSeriesBox
            label={SERIES.sf2.label}
            teamA="354esports"
            teamB="dusty"
            winner={props.prediction.sf2_winner}
            score={props.prediction.sf2_score}
          />
        </div>
        <div className="flex flex-col gap-4">
          <ColumnLabel>Finals</ColumnLabel>
          <ViewSeriesBox
            label={SERIES.gf.label}
            teamA={props.prediction.sf1_winner}
            teamB={props.prediction.sf2_winner}
            winner={props.prediction.gf_winner}
            score={props.prediction.gf_score}
            accent
          />
          <ViewSeriesBox
            label={SERIES.third.label}
            teamA={getSf1Loser(props.prediction.sf1_winner)!}
            teamB={getSf2Loser(props.prediction.sf2_winner)!}
            winner={props.prediction.third_winner}
            score={props.prediction.third_score}
          />
        </div>
      </div>
    );
  }

  return <FormBracket />;
}

function FormBracket() {
  const { watch } = useFormContext<PredictionSubmission>();
  const sf1Winner = watch('sf1_winner') as Sf1Team | undefined;
  const sf2Winner = watch('sf2_winner') as Sf2Team | undefined;
  const sf1Loser = getSf1Loser(sf1Winner);
  const sf2Loser = getSf2Loser(sf2Winner);

  const gfOptions = [sf1Winner, sf2Winner].filter(
    (t): t is PlayoffTeam => !!t
  );
  const thirdOptions = [sf1Loser, sf2Loser].filter(
    (t): t is PlayoffTeam => !!t
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <ColumnLabel>Semifinals</ColumnLabel>
        <FormSeriesBox
          label={SERIES.sf1.label}
          teams={SF1_TEAMS}
          winnerField="sf1_winner"
          scoreField="sf1_score"
        />
        <FormSeriesBox
          label={SERIES.sf2.label}
          teams={SF2_TEAMS}
          winnerField="sf2_winner"
          scoreField="sf2_score"
        />
      </div>
      <div className="flex flex-col gap-4">
        <ColumnLabel>Finals</ColumnLabel>
        <FormSeriesBox
          label={SERIES.gf.label}
          teams={gfOptions}
          winnerField="gf_winner"
          scoreField="gf_score"
          placeholderHint="Pick both semifinal winners first"
          accent
        />
        <FormSeriesBox
          label={SERIES.third.label}
          teams={thirdOptions}
          winnerField="third_winner"
          scoreField="third_score"
          placeholderHint="Pick both semifinal winners first"
        />
      </div>
    </div>
  );
}

function ColumnLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/50 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function ViewSeriesBox({
  label,
  teamA,
  teamB,
  winner,
  score,
  accent,
}: {
  label: string;
  teamA: PlayoffTeam;
  teamB: PlayoffTeam;
  winner: PlayoffTeam;
  score: SeriesScore;
  accent?: boolean;
}) {
  return (
    <div
      className={
        'rounded-lg border bg-card p-3 ' +
        (accent ? 'border-primary/40' : 'border-border')
      }
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <Badge variant="secondary">{score}</Badge>
      </div>
      <TeamRow team={teamA} isWinner={teamA === winner} />
      <div className="my-1 h-px bg-border" />
      <TeamRow team={teamB} isWinner={teamB === winner} />
    </div>
  );
}

function TeamRow({
  team,
  isWinner,
}: {
  team: PlayoffTeam;
  isWinner: boolean;
}) {
  return (
    <div
      className={
        'flex items-center gap-2 rounded px-2 py-1.5 ' +
        (isWinner ? 'bg-primary/15 font-semibold' : 'text-muted-foreground')
      }
    >
      <Image
        src={`/Teams/${team}.png`}
        alt={RL_TEAM_NAMES[team]}
        width={24}
        height={24}
        className="rounded"
      />
      <span className="flex-1 truncate text-sm">{RL_TEAM_NAMES[team]}</span>
      {isWinner && <span className="text-xs text-primary">WINNER</span>}
    </div>
  );
}

function FormSeriesBox({
  label,
  teams,
  winnerField,
  scoreField,
  placeholderHint,
  accent,
}: {
  label: string;
  teams: readonly PlayoffTeam[];
  winnerField: 'sf1_winner' | 'sf2_winner' | 'gf_winner' | 'third_winner';
  scoreField: 'sf1_score' | 'sf2_score' | 'gf_score' | 'third_score';
  placeholderHint?: string;
  accent?: boolean;
}) {
  const { watch, setValue } = useFormContext<PredictionSubmission>();
  const winner = watch(winnerField) as PlayoffTeam | undefined;
  const score = watch(scoreField) as SeriesScore | undefined;
  const disabled = teams.length < 2;

  return (
    <div
      className={
        'rounded-lg border bg-card p-3 ' +
        (accent ? 'border-primary/40' : 'border-border')
      }
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>

      {disabled ? (
        <div className="py-4 text-center text-xs italic text-muted-foreground">
          {placeholderHint ?? 'Waiting for earlier picks…'}
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {teams.map((team) => (
              <TeamOptionRow
                key={team}
                team={team}
                selected={winner === team}
                onSelect={() =>
                  setValue(winnerField, team, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Series score</span>
            <Select
              value={score ?? ''}
              onValueChange={(v) =>
                setValue(scoreField, v as SeriesScore, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger size="sm" className="w-[90px]">
                <SelectValue placeholder="4-?" />
              </SelectTrigger>
              <SelectContent>
                {SERIES_SCORES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

function TeamOptionRow({
  team,
  selected,
  onSelect,
}: {
  team: PlayoffTeam;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition ' +
        (selected
          ? 'border-primary bg-primary/15 font-semibold'
          : 'border-border hover:bg-muted/50')
      }
    >
      <Image
        src={`/Teams/${team}.png`}
        alt={RL_TEAM_NAMES[team]}
        width={24}
        height={24}
        className="rounded"
      />
      <span className="flex-1 truncate text-sm">{RL_TEAM_NAMES[team]}</span>
      {selected && <span className="text-xs text-primary">PICKED</span>}
    </button>
  );
}
