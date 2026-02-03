import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { canMoveToEmptySlot } from '@/lib/fantasy/constraints';
import type { FantasyTeamPlayer, RLPlayer, Role, SlotType } from '@/types';

export const dynamic = 'force-dynamic';

// PUT - Move a player to a new position (possibly swapping with another player)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, playerId, targetSlotType, targetRole, targetSubOrder } = body;

    if (!teamId || !playerId || !targetSlotType) {
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

    // Validate the move
    const validation = canMoveToEmptySlot(teamPlayers, playerId, targetSlotType as SlotType);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    // Find the player being moved
    const playerEntry = teamPlayers.find(
      (p) => p.rl_player_id === playerId || p.rl_player?.id === playerId
    );

    if (!playerEntry) {
      return NextResponse.json({ error: 'Player not found on team' }, { status: 404 });
    }

    // Find if there's a player in the target slot
    const playerInTargetSlot = teamPlayers.find((p) => {
      if (targetSlotType === 'active') {
        return p.slot_type === 'active' && p.role === targetRole;
      }
      return p.slot_type === 'substitute' && p.sub_order === targetSubOrder;
    });

    // If there's a player in the target slot, use the swap function
    if (playerInTargetSlot && playerInTargetSlot.id !== playerEntry.id) {
      // Use the database function to swap atomically (bypasses trigger conflicts)
      const { error: swapError } = await supabase.rpc('swap_player_positions', {
        p_team_id: teamId,
        p_player1_id: playerEntry.id,
        p_player2_id: playerInTargetSlot.id,
      });

      if (swapError) {
        console.error('Error swapping players:', swapError);
        return NextResponse.json({ error: 'Failed to move player' }, { status: 500 });
      }
    } else {
      // No player in target slot, just update the moving player
      const { error: updateError } = await supabase
        .from('fantasy_team_players')
        .update({
          slot_type: targetSlotType,
          role: targetRole || null,
          sub_order: targetSubOrder || null,
        })
        .eq('id', playerEntry.id);

      if (updateError) {
        console.error('Error updating player:', updateError);
        return NextResponse.json({ error: 'Failed to move player' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
