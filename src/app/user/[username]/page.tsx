import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FieldVisualization } from '@/components/fantasy';
import type { FantasyTeamPlayer, PointsBreakdown } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  // Fetch user
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('username', decodeURIComponent(username))
    .single();

  if (!user) {
    notFound();
  }

  // Fetch user's team with players
  const { data: team } = await supabase
    .from('fantasy_teams')
    .select('*')
    .eq('user_id', user.id)
    .single();

  let teamPlayers: FantasyTeamPlayer[] = [];
  if (team) {
    const { data: players } = await supabase
      .from('fantasy_team_players')
      .select('*, rl_player:rl_players(*)')
      .eq('fantasy_team_id', team.id);
    teamPlayers = players || [];
  }

  // Fetch weekly scores
  const { data: weeklyScores } = await supabase
    .from('weekly_scores')
    .select(`
      *,
      weeks!inner(week_number, scores_published)
    `)
    .eq('fantasy_team_id', team?.id || '')
    .eq('weeks.scores_published', true)
    .order('weeks(week_number)', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPoints = weeklyScores?.reduce((sum: number, s: any) => sum + s.total_points, 0) || 0;

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('is-IS').format(points);
  };

  return (
    <div className="space-y-6">
      {/* User header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback className="text-2xl">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user.username}</h1>
              {team && (
                <p className="text-muted-foreground">{team.name}</p>
              )}
              {user.is_admin && (
                <Badge variant="secondary" className="mt-1">Admin</Badge>
              )}
            </div>
            <div className="ml-auto text-right">
              <div className="text-3xl font-bold">{formatPoints(totalPoints)}</div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {team ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Team visualization */}
          <Card>
            <CardHeader>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription>Fantasy team lineup</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldVisualization players={teamPlayers} disabled />
            </CardContent>
          </Card>

          {/* Points history */}
          <Card>
            <CardHeader>
              <CardTitle>Points History</CardTitle>
              <CardDescription>Weekly performance</CardDescription>
            </CardHeader>
            <CardContent>
              {weeklyScores && weeklyScores.length > 0 ? (
                <div className="space-y-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {weeklyScores.map((score: any) => {
                    const week = score.weeks as { week_number: number };
                    const breakdown = score.breakdown as PointsBreakdown[];

                    return (
                      <div key={score.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Week {week.week_number}</span>
                          <span className="text-lg font-bold">
                            {formatPoints(score.total_points)} pts
                          </span>
                        </div>
                        {breakdown && breakdown.length > 0 && (
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {breakdown.map((player) => (
                              <div key={player.player_id} className="flex justify-between">
                                <span className="flex items-center gap-1">
                                  <span className="text-xs uppercase">
                                    {player.role.charAt(0)}
                                  </span>
                                  {player.player_name}
                                </span>
                                <span>{player.total_points} pts</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No scores yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              This user hasn&apos;t created a fantasy team yet
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
