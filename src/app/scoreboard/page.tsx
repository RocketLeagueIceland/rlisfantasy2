import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardTable } from '@/components/scoreboard/LeaderboardTable';
import type { ScoreboardEntry } from '@/types';

export const dynamic = 'force-dynamic';

async function getScoreboard(): Promise<ScoreboardEntry[]> {
  const supabase = await createClient();

  // Fetch teams with users
  const { data: teams } = await supabase
    .from('fantasy_teams')
    .select(`
      id,
      name,
      user_id,
      users!inner(id, username, avatar_url)
    `);

  if (!teams || teams.length === 0) return [];

  // Fetch all published weekly scores
  const { data: scores } = await supabase
    .from('weekly_scores')
    .select(`
      fantasy_team_id,
      total_points,
      weeks!inner(week_number, scores_published)
    `)
    .eq('weeks.scores_published', true);

  // Build scoreboard entries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: ScoreboardEntry[] = teams.map((team: any) => {
    const teamAny = team;
    const user = (Array.isArray(teamAny.users) ? teamAny.users[0] : teamAny.users) as { id: string; username: string; avatar_url: string | null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamScores = scores?.filter((s: any) => s.fantasy_team_id === team.id) || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const weeklyPoints = teamScores.map((s: any) => ({
      week_number: (s.weeks as { week_number: number }).week_number,
      points: s.total_points,
    }));

    const totalPoints = weeklyPoints.reduce((sum: number, w: { week_number: number; points: number }) => sum + w.points, 0);

    return {
      rank: 0, // Will be calculated after sorting
      user_id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      team_name: team.name,
      total_points: totalPoints,
      weekly_points: weeklyPoints,
    };
  });

  // Sort and assign ranks
  entries.sort((a, b) => b.total_points - a.total_points);
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}

export default async function ScoreboardPage() {
  const entries = await getScoreboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scoreboard</h1>
        <p className="text-muted-foreground">
          Fantasy league standings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
          <CardDescription>
            {entries.length} {entries.length === 1 ? 'team' : 'teams'} competing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overall">
            <TabsList className="mb-4">
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="weekly">Weekly Breakdown</TabsTrigger>
            </TabsList>
            <TabsContent value="overall">
              <LeaderboardTable entries={entries} />
            </TabsContent>
            <TabsContent value="weekly">
              <LeaderboardTable entries={entries} showWeeklyBreakdown />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
