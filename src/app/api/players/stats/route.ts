import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { BASE_POINTS } from '@/lib/scoring/constants';

export const dynamic = 'force-dynamic';

interface PlayerWithStats {
  id: string;
  name: string;
  team: string;
  price: number;
  // Aggregated stats across all weeks
  total_goals: number;
  total_assists: number;
  total_saves: number;
  total_shots: number;
  total_demos_received: number;
  games_played: number;
  // Calculated points (without role bonus)
  points_goals: number;
  points_assists: number;
  points_saves: number;
  points_shots: number;
  points_demos: number;
  total_points: number;
  // Ownership
  ownership_count: number;
}

export async function GET() {
  try {
    const supabase = await createServiceClient();

    // Fetch all active players
    const { data: players, error: playersError } = await supabase
      .from('rl_players')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return NextResponse.json({ players: [], error: playersError.message }, { status: 500 });
    }

    // Fetch aggregated stats for all players
    const { data: statsData, error: statsError } = await supabase
      .from('player_stats')
      .select('rl_player_id, games_played, total_goals, total_assists, total_saves, total_shots, total_demos_received');

    if (statsError) {
      console.error('Error fetching stats:', statsError);
      return NextResponse.json({ players: [], error: statsError.message }, { status: 500 });
    }

    // Fetch ownership counts (how many teams have each player)
    const { data: ownershipData, error: ownershipError } = await supabase
      .from('fantasy_team_players')
      .select('rl_player_id');

    if (ownershipError) {
      console.error('Error fetching ownership:', ownershipError);
      return NextResponse.json({ players: [], error: ownershipError.message }, { status: 500 });
    }

    // Aggregate stats by player.
    // Raw totals are summed across all weeks for display.
    // Points are computed per-series (per-week): each week's stat points are
    // averaged by that week's games_played, then summed across weeks. This
    // matches the fantasy scoring rule: "Points are averaged across the games
    // played in each Bo5 series."
    const statsMap = new Map<string, {
      goals: number;
      assists: number;
      saves: number;
      shots: number;
      demos: number;
      games: number;
      points_goals: number;
      points_assists: number;
      points_saves: number;
      points_shots: number;
      points_demos: number;
    }>();

    for (const stat of statsData || []) {
      const existing = statsMap.get(stat.rl_player_id) || {
        goals: 0, assists: 0, saves: 0, shots: 0, demos: 0, games: 0,
        points_goals: 0, points_assists: 0, points_saves: 0, points_shots: 0, points_demos: 0,
      };

      const gp = stat.games_played || 0;
      const weekGoals = stat.total_goals || 0;
      const weekAssists = stat.total_assists || 0;
      const weekSaves = stat.total_saves || 0;
      const weekShots = stat.total_shots || 0;
      const weekDemos = stat.total_demos_received || 0;

      statsMap.set(stat.rl_player_id, {
        goals: existing.goals + weekGoals,
        assists: existing.assists + weekAssists,
        saves: existing.saves + weekSaves,
        shots: existing.shots + weekShots,
        demos: existing.demos + weekDemos,
        games: existing.games + gp,
        points_goals: existing.points_goals + (gp > 0 ? (weekGoals * BASE_POINTS.goal) / gp : 0),
        points_assists: existing.points_assists + (gp > 0 ? (weekAssists * BASE_POINTS.assist) / gp : 0),
        points_saves: existing.points_saves + (gp > 0 ? (weekSaves * BASE_POINTS.save) / gp : 0),
        points_shots: existing.points_shots + (gp > 0 ? (weekShots * BASE_POINTS.shot) / gp : 0),
        points_demos: existing.points_demos + (gp > 0 ? (weekDemos * BASE_POINTS.demo_received) / gp : 0),
      });
    }

    // Count ownership per player
    const ownershipMap = new Map<string, number>();
    for (const ownership of ownershipData || []) {
      ownershipMap.set(
        ownership.rl_player_id,
        (ownershipMap.get(ownership.rl_player_id) || 0) + 1
      );
    }

    // Build response with calculated points
    const playersWithStats: PlayerWithStats[] = (players || []).map(player => {
      const stats = statsMap.get(player.id) || {
        goals: 0, assists: 0, saves: 0, shots: 0, demos: 0, games: 0,
        points_goals: 0, points_assists: 0, points_saves: 0, points_shots: 0, points_demos: 0,
      };

      const points_goals = Math.round(stats.points_goals);
      const points_assists = Math.round(stats.points_assists);
      const points_saves = Math.round(stats.points_saves);
      const points_shots = Math.round(stats.points_shots);
      const points_demos = Math.round(stats.points_demos);
      const total_points = points_goals + points_assists + points_saves + points_shots + points_demos;

      return {
        id: player.id,
        name: player.name,
        team: player.team,
        price: player.price,
        total_goals: stats.goals,
        total_assists: stats.assists,
        total_saves: stats.saves,
        total_shots: stats.shots,
        total_demos_received: stats.demos,
        games_played: stats.games,
        points_goals,
        points_assists,
        points_saves,
        points_shots,
        points_demos,
        total_points,
        ownership_count: ownershipMap.get(player.id) || 0,
      };
    });

    return NextResponse.json({ players: playersWithStats });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ players: [], error: 'Unexpected error' }, { status: 500 });
  }
}
