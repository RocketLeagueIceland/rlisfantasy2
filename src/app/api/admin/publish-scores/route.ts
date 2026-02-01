import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculateTeamScore, getTotalPoints } from '@/lib/scoring/calculator';
import type { PlayerStats, FantasyTeamPlayer, RLTeam, Role, SlotType } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', authUser.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { weekId } = body;

    if (!weekId) {
      return NextResponse.json({ error: 'weekId is required' }, { status: 400 });
    }

    // Verify the week exists and stats have been fetched
    const { data: week, error: weekError } = await supabase
      .from('weeks')
      .select('*')
      .eq('id', weekId)
      .single();

    if (weekError || !week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    if (!week.stats_fetched) {
      return NextResponse.json({ error: 'Stats must be saved before publishing scores' }, { status: 400 });
    }

    // Fetch player stats for this week
    const { data: playerStatsData, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('week_id', weekId);

    if (statsError) {
      console.error('[PublishScores] Error fetching player stats:', statsError);
      return NextResponse.json({ error: 'Failed to fetch player stats' }, { status: 500 });
    }

    // Create a map of player ID to stats
    const playerStatsMap = new Map<string, PlayerStats>();
    for (const stat of (playerStatsData || [])) {
      playerStatsMap.set(stat.rl_player_id, stat as PlayerStats);
    }

    console.log('[PublishScores] Loaded stats for', playerStatsMap.size, 'players');

    // Fetch all fantasy teams with their players
    const { data: fantasyTeams, error: teamsError } = await supabase
      .from('fantasy_teams')
      .select(`
        id,
        user_id,
        name,
        fantasy_team_players (
          id,
          rl_player_id,
          slot_type,
          role,
          sub_order,
          purchase_price,
          rl_players (
            id,
            name,
            team
          )
        )
      `);

    if (teamsError) {
      console.error('[PublishScores] Error fetching fantasy teams:', teamsError);
      return NextResponse.json({ error: 'Failed to fetch fantasy teams' }, { status: 500 });
    }

    console.log('[PublishScores] Found', fantasyTeams?.length || 0, 'fantasy teams');

    // Calculate scores for each team
    const scoresToInsert: {
      week_id: string;
      fantasy_team_id: string;
      total_points: number;
      breakdown: ReturnType<typeof calculateTeamScore>;
    }[] = [];

    for (const team of (fantasyTeams || [])) {
      // Transform the nested data to match FantasyTeamPlayer type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teamPlayers: FantasyTeamPlayer[] = (team.fantasy_team_players || []).map((p: any) => {
        // Supabase returns single foreign key relations as objects, not arrays
        const rlPlayer = p.rl_players;
        return {
          id: p.id,
          fantasy_team_id: team.id,
          rl_player_id: p.rl_player_id,
          slot_type: p.slot_type as SlotType,
          role: p.role as Role | null,
          sub_order: p.sub_order,
          purchase_price: p.purchase_price,
          created_at: '',
          rl_player: rlPlayer ? {
            id: rlPlayer.id,
            name: rlPlayer.name,
            team: rlPlayer.team as RLTeam,
            price: 0,
            ballchasing_id: null,
            aliases: [],
            is_active: true,
            created_at: '',
          } : undefined,
        };
      });

      // Calculate the score
      const breakdown = calculateTeamScore(teamPlayers, playerStatsMap);
      const totalPoints = getTotalPoints(breakdown);

      scoresToInsert.push({
        week_id: weekId,
        fantasy_team_id: team.id,
        total_points: totalPoints,
        breakdown,
      });

      console.log(`[PublishScores] Team "${team.name}": ${totalPoints} points`);
    }

    // Delete existing scores for this week (in case of re-publish)
    const { error: deleteError } = await supabase
      .from('weekly_scores')
      .delete()
      .eq('week_id', weekId);

    if (deleteError) {
      console.error('[PublishScores] Error deleting existing scores:', deleteError);
      return NextResponse.json({ error: 'Failed to clear existing scores' }, { status: 500 });
    }

    // Insert new scores
    if (scoresToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('weekly_scores')
        .insert(scoresToInsert);

      if (insertError) {
        console.error('[PublishScores] Error inserting scores:', insertError);
        return NextResponse.json({ error: 'Failed to save scores' }, { status: 500 });
      }
    }

    // Mark week as published
    const { error: updateError } = await supabase
      .from('weeks')
      .update({ scores_published: true })
      .eq('id', weekId);

    if (updateError) {
      console.error('[PublishScores] Error marking week as published:', updateError);
      return NextResponse.json({ error: 'Failed to mark week as published' }, { status: 500 });
    }

    console.log('[PublishScores] Successfully published scores for', scoresToInsert.length, 'teams');

    return NextResponse.json({
      success: true,
      teamsScored: scoresToInsert.length,
      scores: scoresToInsert.map(s => ({
        teamId: s.fantasy_team_id,
        totalPoints: s.total_points,
      })),
    });
  } catch (e) {
    console.error('[PublishScores] Error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
