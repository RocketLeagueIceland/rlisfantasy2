import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ROLE_INFO, BASE_POINTS, ROLE_MULTIPLIERS, INITIAL_BUDGET, TEAM_SIZE } from '@/lib/scoring/constants';
import { MAX_PLAYERS_PER_RL_TEAM, MAX_ACTIVE_PER_RL_TEAM } from '@/lib/fantasy/constraints';

export default function RulesPage() {
  const formatBudget = (amount: number) => {
    if (amount >= 1_000_000) {
      const millions = amount / 1_000_000;
      return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
    }
    return new Intl.NumberFormat('is-IS').format(amount);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">RLIS Fantasy League</h1>
        <p className="text-xl text-muted-foreground">
          Build your dream Rocket League team and compete!
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-invert max-w-none">
          <ol className="list-decimal list-inside space-y-2">
            <li>Create your fantasy team with {formatBudget(INITIAL_BUDGET)} kr budget</li>
            <li>Select {TEAM_SIZE.total} Rocket League players from RLIS teams</li>
            <li>Assign 3 active players (Striker, Midfield, Goalkeeper) and 3 substitutes</li>
            <li>Earn points each week based on your players&apos; real performance</li>
            <li>Compete on the scoreboard for ultimate bragging rights!</li>
          </ol>
        </CardContent>
      </Card>

      {/* Team Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Team Structure</CardTitle>
          <CardDescription>
            Your team consists of {TEAM_SIZE.total} players
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-3">Active Players (3)</h3>
              <div className="space-y-3">
                {(['striker', 'midfield', 'goalkeeper'] as const).map((role) => (
                  <div key={role} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <Image
                      src={ROLE_INFO[role].icon}
                      alt={role}
                      width={32}
                      height={32}
                    />
                    <div>
                      <div className="font-medium">{ROLE_INFO[role].name}</div>
                      <div className="text-sm text-muted-foreground">
                        {ROLE_INFO[role].description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Substitutes (3)</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Substitutes fill in when active players miss games in a series.
                They are used in order (Sub 1 first, then Sub 2, then Sub 3).
              </p>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm">
                  <strong>Important:</strong> When a substitute fills in, they inherit
                  the role bonus of the player they&apos;re replacing!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Constraints */}
      <Card>
        <CardHeader>
          <CardTitle>Team Constraints</CardTitle>
          <CardDescription>
            Restrictions on player selection from the same RL team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            To promote balanced team building and prevent stacking players from dominant teams,
            the following constraints apply:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-semibold mb-2">Max {MAX_PLAYERS_PER_RL_TEAM} Players Per RL Team</h4>
              <p className="text-sm text-muted-foreground">
                You cannot have more than {MAX_PLAYERS_PER_RL_TEAM} players from the same Rocket League team
                (e.g., max 2 players from Thor).
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-semibold mb-2">Max {MAX_ACTIVE_PER_RL_TEAM} Active Per RL Team</h4>
              <p className="text-sm text-muted-foreground">
                If you have {MAX_PLAYERS_PER_RL_TEAM} players from the same team, at least one must be a substitute.
                Only {MAX_ACTIVE_PER_RL_TEAM} can be in an active role.
              </p>
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Example:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><span className="text-green-500">✓</span> 1 player from Dusty as Striker, 1 as Substitute 2</li>
              <li><span className="text-green-500">✓</span> 1 player from Thor as Goalkeeper</li>
              <li><span className="text-red-500">✗</span> 2 players from Thor as Striker and Midfield (too many active)</li>
              <li><span className="text-red-500">✗</span> 3 players from the same team (exceeds maximum)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Points System */}
      <Card>
        <CardHeader>
          <CardTitle>Points System</CardTitle>
          <CardDescription>
            Points are earned based on in-game statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stat</TableHead>
                <TableHead className="text-center">Base Points</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Image src="/striker.png" alt="Striker" width={20} height={20} />
                    Striker
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Image src="/midfield.png" alt="Midfield" width={20} height={20} />
                    Midfield
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Image src="/goalkeeper.png" alt="Goalkeeper" width={20} height={20} />
                    Goalkeeper
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Goal</TableCell>
                <TableCell className="text-center">{BASE_POINTS.goal}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="default">{BASE_POINTS.goal * ROLE_MULTIPLIERS.striker.goal} (2x)</Badge>
                </TableCell>
                <TableCell className="text-center">{BASE_POINTS.goal}</TableCell>
                <TableCell className="text-center">{BASE_POINTS.goal}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Assist</TableCell>
                <TableCell className="text-center">{BASE_POINTS.assist}</TableCell>
                <TableCell className="text-center">{BASE_POINTS.assist}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="default">{BASE_POINTS.assist * ROLE_MULTIPLIERS.midfield.assist} (2x)</Badge>
                </TableCell>
                <TableCell className="text-center">{BASE_POINTS.assist}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Save</TableCell>
                <TableCell className="text-center">{BASE_POINTS.save}</TableCell>
                <TableCell className="text-center">{BASE_POINTS.save}</TableCell>
                <TableCell className="text-center">{BASE_POINTS.save}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="default">{BASE_POINTS.save * ROLE_MULTIPLIERS.goalkeeper.save} (2x)</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Shot</TableCell>
                <TableCell className="text-center">{BASE_POINTS.shot}</TableCell>
                <TableCell className="text-center">{BASE_POINTS.shot}</TableCell>
                <TableCell className="text-center">{BASE_POINTS.shot}</TableCell>
                <TableCell className="text-center">{BASE_POINTS.shot}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Demo Received</TableCell>
                <TableCell className="text-center text-destructive">{BASE_POINTS.demo_received}</TableCell>
                <TableCell className="text-center text-destructive">{BASE_POINTS.demo_received}</TableCell>
                <TableCell className="text-center text-destructive">{BASE_POINTS.demo_received}</TableCell>
                <TableCell className="text-center text-destructive">{BASE_POINTS.demo_received}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground mt-4">
            Points are averaged across the games played in each Bo5 series.
          </p>
        </CardContent>
      </Card>

      {/* Substitution Logic */}
      <Card>
        <CardHeader>
          <CardTitle>Substitution Logic</CardTitle>
          <CardDescription>
            How substitutes fill in for missing games
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            In RLIS, series are played as Best of 5 (Bo5), meaning 3-5 games per series.
            If an active player misses games, substitutes automatically fill in.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Example:</h4>
            <p className="text-sm">
              Your Striker plays only 3 out of 5 games. Sub 1 played 4 games.
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li>Striker&apos;s points are calculated from their 3 games</li>
              <li>Sub 1&apos;s first 2 games fill the gap (with Striker&apos;s 2x goal bonus!)</li>
              <li>Points are averaged across all 5 games</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Subs are used in order: Sub 1 first, then Sub 2 if needed, then Sub 3.
            All of one active player&apos;s missing games are filled before moving to the next.
          </p>
        </CardContent>
      </Card>

      {/* Transfers */}
      <Card>
        <CardHeader>
          <CardTitle>Transfers</CardTitle>
          <CardDescription>
            Modify your team during the season
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2">
            <li>You can make <strong>1 transfer per week</strong></li>
            <li>Transfer window opens after each broadcast (admin controlled)</li>
            <li>Transfer window closes <strong>1 hour before</strong> the next broadcast</li>
            <li>Sold players return their <strong>purchase price</strong> to your budget</li>
            <li>New players are bought at their <strong>current market price</strong></li>
          </ul>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">
              <strong>Tip:</strong> Plan your transfers wisely! You can&apos;t undo a transfer,
              and you only get one per week.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* RLIS Teams */}
      <Card>
        <CardHeader>
          <CardTitle>RLIS Teams</CardTitle>
          <CardDescription>
            The 6 teams competing in the Icelandic Rocket League league
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { id: '354esports', name: '354 Esports' },
              { id: 'dusty', name: 'Dusty' },
              { id: 'hamar', name: 'Hamar' },
              { id: 'omon', name: 'Ómon' },
              { id: 'thor', name: 'Thor' },
              { id: 'stjarnan', name: 'Stjarnan' },
            ].map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted"
              >
                <Image
                  src={`/Teams/${team.id}.png`}
                  alt={team.name}
                  width={40}
                  height={40}
                  className="rounded"
                />
                <span className="font-medium">{team.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
