import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { canSwapPlayers } from '@/lib/fantasy/constraints';
import type { FantasyTeamPlayer, RLPlayer } from '@/types';

export const dynamic = 'force-dynamic';

// PUT - Swap positions of two players on a saved team
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, player1Id, player2Id } = body;

    if (!teamId || !player1Id || !player2Id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user owns the team
    const { data: team, error: teamError } = await supabase
      .from('fantasy_teams')
      .select('*')
      .eq('id', teamId)
      .eq('user_id', authUser.id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }

    // Fetch team players with rl_player data
    const { data: teamPlayersData, error: playersError } = await supabase
      .from('fantasy_team_players')
      .select('*, rl_player:rl_players(*)')
      .eq('fantasy_team_id', teamId);

    if (playersError) {
      console.error('Error fetching team players:', playersError);
      return NextResponse.json({ error: 'Failed to fetch team players' }, { status: 500 });
    }

    const teamPlayers = teamPlayersData as (FantasyTeamPlayer & { rl_player: RLPlayer })[];

    // Validate the swap
    const validation = canSwapPlayers(teamPlayers, player1Id, player2Id);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    // Find the two player entries
    const player1Entry = teamPlayers.find(
      (p) => p.rl_player_id === player1Id || p.rl_player?.id === player1Id
    );
    const player2Entry = teamPlayers.find(
      (p) => p.rl_player_id === player2Id || p.rl_player?.id === player2Id
    );

    if (!player1Entry || !player2Entry) {
      return NextResponse.json({ error: 'Players not found on team' }, { status: 404 });
    }

    // Swap the slot_type, role, and sub_order atomically
    const { error: update1Error } = await supabase
      .from('fantasy_team_players')
      .update({
        slot_type: player2Entry.slot_type,
        role: player2Entry.role,
        sub_order: player2Entry.sub_order,
      })
      .eq('id', player1Entry.id);

    if (update1Error) {
      console.error('Error updating player 1:', update1Error);
      return NextResponse.json({ error: 'Failed to swap players' }, { status: 500 });
    }

    const { error: update2Error } = await supabase
      .from('fantasy_team_players')
      .update({
        slot_type: player1Entry.slot_type,
        role: player1Entry.role,
        sub_order: player1Entry.sub_order,
      })
      .eq('id', player2Entry.id);

    if (update2Error) {
      console.error('Error updating player 2:', update2Error);
      // Try to rollback the first update
      await supabase
        .from('fantasy_team_players')
        .update({
          slot_type: player1Entry.slot_type,
          role: player1Entry.role,
          sub_order: player1Entry.sub_order,
        })
        .eq('id', player1Entry.id);
      return NextResponse.json({ error: 'Failed to swap players' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
