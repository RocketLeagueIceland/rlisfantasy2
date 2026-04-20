'use client';

import Image from 'next/image';
import { useFormContext } from 'react-hook-form';
import { RL_TEAM_NAMES } from '@/lib/scoring/constants';
import {
  deriveSf1Winner,
  deriveSf2Winner,
  type BracketFormValues,
} from '@/lib/predictions/bracket-form';
import { getSf1Loser, getSf2Loser } from '@/lib/predictions/helpers';
import type {
  PlayoffPrediction,
  PlayoffTeam,
  SeriesScore,
} from '@/types/predictions';

type BracketProps =
  | { mode: 'view'; prediction: PlayoffPrediction; highlight?: boolean }
  | { mode: 'form' };

const GAMES_TO_WIN = 4;

export function PredictionBracket(props: BracketProps) {
  if (props.mode === 'view') {
    return <ViewBracket prediction={props.prediction} highlight={props.highlight} />;
  }
  return <FormBracket />;
}

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------

function ViewBracket({
  prediction,
  highlight,
}: {
  prediction: PlayoffPrediction;
  highlight?: boolean;
}) {
  const sf1Loser = getSf1Loser(prediction.sf1_winner);
  const sf2Loser = getSf2Loser(prediction.sf2_winner);

  return (
    <div
      className={
        'space-y-6 ' +
        (highlight ? 'rounded-lg p-2 ring-2 ring-primary/60' : '')
      }
    >
      {/* Top half: Semifinals + Grand Final, vertically aligned via flex center */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
        <BracketColumn>
          <Banner>Semifinals</Banner>
          <SfPairWithConnectors>
            <ViewSeriesBox
              teamA="thor"
              teamB="stjarnan"
              winner={prediction.sf1_winner}
              score={prediction.sf1_score}
            />
            <ViewSeriesBox
              teamA="354esports"
              teamB="dusty"
              winner={prediction.sf2_winner}
              score={prediction.sf2_score}
            />
          </SfPairWithConnectors>
        </BracketColumn>

        <CenteredColumn>
          <Banner>Grand Final</Banner>
          <ViewSeriesBox
            teamA={prediction.sf1_winner}
            teamB={prediction.sf2_winner}
            winner={prediction.gf_winner}
            score={prediction.gf_score}
            accent
          />
        </CenteredColumn>
      </div>

      {/* Bottom half: Third Place Match on the right only */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
        <div className="hidden md:block" />
        <BracketColumn>
          <Banner>Third Place Match</Banner>
          <ViewSeriesBox
            teamA={sf1Loser!}
            teamB={sf2Loser!}
            winner={prediction.third_winner}
            score={prediction.third_score}
          />
        </BracketColumn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form mode
// ---------------------------------------------------------------------------

function FormBracket() {
  const { watch } = useFormContext<BracketFormValues>();
  const values = watch();
  const sf1Winner = deriveSf1Winner(values);
  const sf2Winner = deriveSf2Winner(values);
  const sf1Loser = getSf1Loser(sf1Winner);
  const sf2Loser = getSf2Loser(sf2Winner);

  return (
    <div className="space-y-6">
      {/* Top half: Semifinals + Grand Final */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
        <BracketColumn>
          <Banner>Semifinals</Banner>
          <SfPairWithConnectors>
            <FormSeriesBox
              teamA="thor"
              teamB="stjarnan"
              fieldA="sf1_a"
              fieldB="sf1_b"
            />
            <FormSeriesBox
              teamA="354esports"
              teamB="dusty"
              fieldA="sf2_a"
              fieldB="sf2_b"
            />
          </SfPairWithConnectors>
        </BracketColumn>

        <CenteredColumn>
          <Banner>Grand Final</Banner>
          <FormSeriesBox
            teamA={sf1Winner}
            teamB={sf2Winner}
            fieldA="gf_a"
            fieldB="gf_b"
            accent
          />
        </CenteredColumn>
      </div>

      {/* Bottom half: Third Place Match on the right only */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
        <div className="hidden md:block" />
        <BracketColumn>
          <Banner>Third Place Match</Banner>
          <FormSeriesBox
            teamA={sf1Loser}
            teamB={sf2Loser}
            fieldA="third_a"
            fieldB="third_b"
          />
        </BracketColumn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function BracketColumn({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

/**
 * Right-column wrapper that vertically centers its contents (banner + series
 * box) within the grid row. This is what makes the GF series box sit at the
 * same y-coordinate as the midpoint of the SF pair on the left, so the
 * bracket connector lines end exactly at the GF box's vertical centre.
 */
function CenteredColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center gap-3">{children}</div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/60 px-4 py-2 text-center text-sm font-semibold tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

/**
 * Wraps the two semifinal series boxes and draws the bracket connector:
 *   - right-then-down line from SF1's midpoint
 *   - right-then-up line from SF2's midpoint
 *   - a horizontal extension from the merge point toward the Grand Final
 * Lines only render at md+ where the bracket becomes two columns.
 */
function SfPairWithConnectors({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col gap-3">
      {/* SF1 → merge (right, then down) */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[25%] left-full hidden h-[calc(25%+0.375rem)] w-6 border-t border-r border-border md:block"
      />
      {/* SF2 → merge (right, then up) */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[25%] left-full hidden h-[calc(25%+0.375rem)] w-6 border-b border-r border-border md:block"
      />
      {/* Merge point → Grand Final (horizontal) */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-full hidden h-px w-12 translate-x-6 bg-border md:block"
      />
      {children}
    </div>
  );
}

function SeriesBoxShell({
  accent,
  children,
}: {
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        'overflow-hidden rounded-lg border bg-card ' +
        (accent ? 'border-primary/40' : 'border-border')
      }
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View-mode series box + team row
// ---------------------------------------------------------------------------

function ViewSeriesBox({
  teamA,
  teamB,
  winner,
  score,
  accent,
}: {
  teamA: PlayoffTeam;
  teamB: PlayoffTeam;
  winner: PlayoffTeam;
  score: SeriesScore;
  accent?: boolean;
}) {
  const [winnerGames, loserGames] = score.split('-').map(Number) as [
    number,
    number
  ];
  const gamesA = teamA === winner ? winnerGames : loserGames;
  const gamesB = teamB === winner ? winnerGames : loserGames;

  return (
    <SeriesBoxShell accent={accent}>
      <StaticTeamRow team={teamA} games={gamesA} isWinner={teamA === winner} />
      <div className="h-px bg-border" />
      <StaticTeamRow team={teamB} games={gamesB} isWinner={teamB === winner} />
    </SeriesBoxShell>
  );
}

function StaticTeamRow({
  team,
  games,
  isWinner,
}: {
  team: PlayoffTeam;
  games: number;
  isWinner: boolean;
}) {
  return (
    <div
      className={
        'flex items-center gap-3 px-3 py-2 ' +
        (isWinner ? 'bg-primary/10' : '')
      }
    >
      <TeamLogo team={team} />
      <span
        className={
          'flex-1 truncate text-sm ' +
          (isWinner ? 'font-semibold text-foreground' : 'text-muted-foreground')
        }
      >
        {RL_TEAM_NAMES[team]}
      </span>
      <span
        className={
          'flex h-7 w-9 items-center justify-center rounded text-sm font-semibold tabular-nums ' +
          (isWinner
            ? 'bg-primary/20 text-primary'
            : 'bg-muted text-muted-foreground')
        }
      >
        {games}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form-mode series box + team row
// ---------------------------------------------------------------------------

function FormSeriesBox({
  teamA,
  teamB,
  fieldA,
  fieldB,
  accent,
}: {
  teamA: PlayoffTeam | undefined;
  teamB: PlayoffTeam | undefined;
  fieldA: keyof BracketFormValues;
  fieldB: keyof BracketFormValues;
  accent?: boolean;
}) {
  const { watch } = useFormContext<BracketFormValues>();
  const gamesA = watch(fieldA);
  const gamesB = watch(fieldB);
  const aWins = gamesA === GAMES_TO_WIN && gamesB !== GAMES_TO_WIN;
  const bWins = gamesB === GAMES_TO_WIN && gamesA !== GAMES_TO_WIN;

  return (
    <SeriesBoxShell accent={accent}>
      <EditableTeamRow team={teamA} fieldName={fieldA} isWinner={aWins} />
      <div className="h-px bg-border" />
      <EditableTeamRow team={teamB} fieldName={fieldB} isWinner={bWins} />
    </SeriesBoxShell>
  );
}

function EditableTeamRow({
  team,
  fieldName,
  isWinner,
}: {
  team: PlayoffTeam | undefined;
  fieldName: keyof BracketFormValues;
  isWinner: boolean;
}) {
  const { setValue, watch } = useFormContext<BracketFormValues>();
  const current = watch(fieldName);
  const label = team ? RL_TEAM_NAMES[team] : 'TBD';

  return (
    <div
      className={
        'flex items-center gap-3 px-3 py-2 ' +
        (isWinner ? 'bg-primary/10' : '')
      }
    >
      <TeamLogo team={team} />
      <span
        className={
          'flex-1 truncate text-sm ' +
          (team
            ? isWinner
              ? 'font-semibold text-foreground'
              : 'text-muted-foreground'
            : 'italic text-muted-foreground')
        }
      >
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={4}
        step={1}
        inputMode="numeric"
        aria-label={`${label} games won`}
        value={current ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            setValue(fieldName, undefined as never, {
              shouldValidate: true,
              shouldDirty: true,
            });
            return;
          }
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          const clamped = Math.max(0, Math.min(4, Math.trunc(n)));
          setValue(fieldName, clamped as never, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
        className={
          'h-8 w-12 rounded border bg-background text-center text-sm font-semibold tabular-nums outline-none transition ' +
          'focus:border-primary focus:ring-1 focus:ring-primary ' +
          (isWinner
            ? 'border-primary/60 bg-primary/10 text-primary'
            : 'border-border text-foreground')
        }
      />
    </div>
  );
}

function TeamLogo({ team }: { team: PlayoffTeam | undefined }) {
  if (!team) {
    return (
      <div
        aria-hidden
        className="h-7 w-7 shrink-0 rounded border border-dashed border-border bg-muted/40"
      />
    );
  }
  return (
    <Image
      src={`/Teams/${team}.png`}
      alt={RL_TEAM_NAMES[team]}
      width={28}
      height={28}
      className="shrink-0 rounded"
    />
  );
}
