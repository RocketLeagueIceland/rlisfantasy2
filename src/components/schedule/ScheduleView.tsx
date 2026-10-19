import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TEAM_KEY_MAP, type Match, type Round } from '@/lib/liquipedia/schedule';

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

function isDecided(match: Match) {
  return !!match.forfeit || (match.score1 !== null && match.score2 !== null);
}

function MatchRow({ match }: { match: Match }) {
  const played = isDecided(match);
  const team1Won = match.forfeit ? match.forfeit === 'team2' : played && match.score1! > match.score2!;
  const team2Won = match.forfeit ? match.forfeit === 'team1' : played && match.score2! > match.score1!;

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      {/* Team 1 */}
      <div className={`flex items-center gap-2 flex-1 justify-end ${team1Won ? 'font-bold' : played ? 'text-muted-foreground' : ''}`}>
        <span className="text-sm text-right">{match.team1}</span>
        <TeamLogo team={match.team1} />
      </div>

      {/* Score */}
      <div className="w-20 text-center">
        {match.forfeit ? (
          <span className="font-mono font-bold text-lg" title="Forfeit">
            {team1Won ? 'W' : 'FF'} - {team2Won ? 'W' : 'FF'}
          </span>
        ) : played ? (
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

export function ScheduleView({ schedule }: { schedule: Round[] }) {
  const today = new Date().toISOString().split('T')[0];

  // Find the current/next round
  const currentRoundIndex = schedule.findIndex(r => r.date >= today);

  return (
    <div className="space-y-4">
      {schedule.map((round, index) => {
        const roundDate = new Date(round.date + 'T14:00:00Z');
        const played = round.matches.every(isDecided);
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
  );
}
