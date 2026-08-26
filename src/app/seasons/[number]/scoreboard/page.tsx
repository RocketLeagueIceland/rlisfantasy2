import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getSeasonByNumber } from '@/lib/seasons';
import { getScoreboard } from '@/lib/scoreboard/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardTable } from '@/components/scoreboard/LeaderboardTable';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ number: string }>;
}

export default async function SeasonScoreboardPage({ params }: Props) {
  const { number } = await params;
  const supabase = await createServiceClient();
  const season = await getSeasonByNumber(supabase, parseInt(number, 10));
  if (!season) notFound();

  const entries = await getScoreboard(season.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scoreboard</h1>
        <p className="text-muted-foreground">{season.name} final standings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
          <CardDescription>
            {entries.length} {entries.length === 1 ? 'team' : 'teams'} competed
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
