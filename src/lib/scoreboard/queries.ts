import { createServiceClient } from '@/lib/supabase/server';
import type { ScoreboardEntry } from '@/types';

// Builds the standings for one season. Used by /scoreboard (current season)
// and /seasons/[number]/scoreboard (archive).
export async function getScoreboard(seasonId: string): Promise<ScoreboardEntry[]> {
  const supabase = await createServiceClient();

  // Fetch the season's teams with users
  const { data: teams } = await supabase
    .from('fantasy_teams')
    .select(`
      id,
      name,
      user_id,
      users!inner(id, username, avatar_url)
    `)
    .eq('season_id', seasonId);

  if (!teams || teams.length === 0) return [];

  // Fetch the season's published weekly scores
  const { data: scores } = await supabase
    .from('weekly_scores')
    .select(`
      fantasy_team_id,
      total_points,
      weeks!inner(week_number, season_id, scores_published)
    `)
    .eq('weeks.season_id', seasonId)
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
