import Link from 'next/link';
import { Trophy, Users, Calendar, Medal } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { listSeasons } from '@/lib/seasons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function SeasonsPage() {
  const supabase = await createServiceClient();
  const seasons = await listSeasons(supabase);
  const pastSeasons = seasons.filter((s) => !s.is_current);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Past Seasons</h1>
        <p className="text-muted-foreground">
          Browse the archives — final standings, player stats and predictions from previous seasons
        </p>
      </div>

      {pastSeasons.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No past seasons yet — history will appear here once a season wraps up.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pastSeasons.map((season) => (
            <Card key={season.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{season.name}</CardTitle>
                  <Badge variant="secondary">Archived</Badge>
                </div>
                <CardDescription>
                  {season.starts_at
                    ? new Date(season.starts_at).getFullYear()
                    : null}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Link
                    href={`/seasons/${season.number}/scoreboard`}
                    className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors text-sm font-medium"
                  >
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    Scoreboard
                  </Link>
                  <Link
                    href={`/seasons/${season.number}/players`}
                    className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors text-sm font-medium"
                  >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Players
                  </Link>
                  <Link
                    href={`/seasons/${season.number}/schedule`}
                    className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors text-sm font-medium"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Schedule
                  </Link>
                  <Link
                    href={`/seasons/${season.number}/predictions`}
                    className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors text-sm font-medium"
                  >
                    <Medal className="h-4 w-4 text-muted-foreground" />
                    Predictions
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
