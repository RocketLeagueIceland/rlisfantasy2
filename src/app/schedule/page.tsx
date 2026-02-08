import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RL_TEAM_NAMES } from '@/lib/scoring/constants';

// Map display names back to team image keys
const TEAM_KEY_MAP: Record<string, string> = {
  'Dusty': 'dusty',
  'Thor': 'thor',
  'Ómon': 'omon',
  '354 Esports': '354esports',
  'Hamar': 'hamar',
  'Stjarnan': 'stjarnan',
};

interface Match {
  time: string;
  team1: string;
  team2: string;
  score1: number | null;
  score2: number | null;
}

interface Round {
  round: number;
  date: string;
  matches: Match[];
}

const schedule: Round[] = [
  {
    round: 1,
    date: '2026-02-01',
    matches: [
      { time: '14:00', team1: 'Dusty', team2: 'Thor', score1: 1, score2: 3 },
      { time: '14:45', team1: 'Ómon', team2: '354 Esports', score1: 0, score2: 3 },
      { time: '15:30', team1: 'Hamar', team2: 'Stjarnan', score1: 0, score2: 3 },
    ],
  },
  {
    round: 2,
    date: '2026-02-08',
    matches: [
      { time: '14:00', team1: 'Ómon', team2: 'Thor', score1: 0, score2: 3 },
      { time: '14:45', team1: 'Hamar', team2: 'Dusty', score1: 0, score2: 3 },
      { time: '15:30', team1: 'Stjarnan', team2: '354 Esports', score1: 2, score2: 3 },
    ],
  },
  {
    round: 3,
    date: '2026-02-15',
    matches: [
      { time: '14:00', team1: 'Hamar', team2: 'Thor', score1: null, score2: null },
      { time: '14:45', team1: 'Stjarnan', team2: 'Ómon', score1: null, score2: null },
      { time: '15:30', team1: '354 Esports', team2: 'Dusty', score1: null, score2: null },
    ],
  },
  {
    round: 4,
    date: '2026-02-22',
    matches: [
      { time: '14:00', team1: 'Stjarnan', team2: 'Thor', score1: null, score2: null },
      { time: '14:45', team1: '354 Esports', team2: 'Hamar', score1: null, score2: null },
      { time: '15:30', team1: 'Dusty', team2: 'Ómon', score1: null, score2: null },
    ],
  },
  {
    round: 5,
    date: '2026-03-01',
    matches: [
      { time: '14:00', team1: '354 Esports', team2: 'Thor', score1: null, score2: null },
      { time: '14:45', team1: 'Dusty', team2: 'Stjarnan', score1: null, score2: null },
      { time: '15:30', team1: 'Ómon', team2: 'Hamar', score1: null, score2: null },
    ],
  },
  {
    round: 6,
    date: '2026-03-08',
    matches: [
      { time: '14:00', team1: 'Thor', team2: 'Dusty', score1: null, score2: null },
      { time: '14:45', team1: '354 Esports', team2: 'Ómon', score1: null, score2: null },
      { time: '15:30', team1: 'Stjarnan', team2: 'Hamar', score1: null, score2: null },
    ],
  },
  {
    round: 7,
    date: '2026-03-15',
    matches: [
      { time: '14:00', team1: 'Thor', team2: 'Ómon', score1: null, score2: null },
      { time: '14:45', team1: 'Dusty', team2: 'Hamar', score1: null, score2: null },
      { time: '15:30', team1: '354 Esports', team2: 'Stjarnan', score1: null, score2: null },
    ],
  },
  {
    round: 8,
    date: '2026-03-22',
    matches: [
      { time: '14:00', team1: 'Thor', team2: 'Hamar', score1: null, score2: null },
      { time: '14:45', team1: 'Ómon', team2: 'Stjarnan', score1: null, score2: null },
      { time: '15:30', team1: 'Dusty', team2: '354 Esports', score1: null, score2: null },
    ],
  },
  {
    round: 9,
    date: '2026-03-29',
    matches: [
      { time: '14:00', team1: 'Thor', team2: 'Stjarnan', score1: null, score2: null },
      { time: '14:45', team1: 'Hamar', team2: '354 Esports', score1: null, score2: null },
      { time: '15:30', team1: 'Ómon', team2: 'Dusty', score1: null, score2: null },
    ],
  },
  {
    round: 10,
    date: '2026-04-19',
    matches: [
      { time: '14:00', team1: 'Thor', team2: '354 Esports', score1: null, score2: null },
      { time: '14:45', team1: 'Stjarnan', team2: 'Dusty', score1: null, score2: null },
      { time: '15:30', team1: 'Hamar', team2: 'Ómon', score1: null, score2: null },
    ],
  },
];

function TeamLogo({ team }: { team: string }) {
  const key = TEAM_KEY_MAP[team];
  return (
    <Image
      src={`/Teams/${key}.png`}
      alt={team}
      width={32}
      height={32}
      className="rounded"
    />
  );
}

function MatchRow({ match }: { match: Match }) {
  const played = match.score1 !== null && match.score2 !== null;
  const team1Won = played && match.score1! > match.score2!;
  const team2Won = played && match.score2! > match.score1!;

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      {/* Team 1 */}
      <div className={`flex items-center gap-2 flex-1 justify-end ${team1Won ? 'font-bold' : played ? 'text-muted-foreground' : ''}`}>
        <span className="text-sm text-right">{match.team1}</span>
        <TeamLogo team={match.team1} />
      </div>

      {/* Score */}
      <div className="w-20 text-center">
        {played ? (
          <span className="font-mono font-bold text-lg">
            {match.score1} - {match.score2}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{match.time} GMT</span>
        )}
      </div>

      {/* Team 2 */}
      <div className={`flex items-center gap-2 flex-1 ${team2Won ? 'font-bold' : played ? 'text-muted-foreground' : ''}`}>
        <TeamLogo team={match.team2} />
        <span className="text-sm">{match.team2}</span>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const today = new Date().toISOString().split('T')[0];

  // Find the current/next round
  const currentRoundIndex = schedule.findIndex(r => r.date >= today);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Schedule</h1>
        <p className="text-muted-foreground">
          RLIS Season 11 League Play - Double Round Robin, Bo5
        </p>
      </div>

      <div className="space-y-4">
        {schedule.map((round, index) => {
          const roundDate = new Date(round.date + 'T14:00:00Z');
          const played = round.matches.every(m => m.score1 !== null);
          const isCurrent = index === currentRoundIndex;
          const formattedDate = roundDate.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });

          return (
            <Card key={round.round} className={isCurrent ? 'border-primary' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">Round {round.round}</CardTitle>
                    {played && <Badge variant="secondary">Played</Badge>}
                    {isCurrent && !played && <Badge>Upcoming</Badge>}
                  </div>
                  <CardDescription>{formattedDate}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {round.matches.map((match, i) => (
                  <MatchRow key={i} match={match} />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
