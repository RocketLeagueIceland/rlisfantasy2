import { createClient } from '@/lib/supabase/server';
import { getCurrentSeason, getCurrentWeek } from '@/lib/seasons';
import { NextResponse } from 'next/server';
import { canAddPlayer } from '@/lib/fantasy/constraints';
import type { SlotType } from '@/types';

export const dynamic = 'force-dynamic';

// POST - Execute a transfer
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      teamId,
      soldPlayerId,
      boughtPlayerId,
      teamPlayerId,
    } = body;

    // Week, prices and budget are resolved server-side - never trusted from
    // the request body.
    const season = await getCurrentSeason(supabase);
    if (!season) {
      return NextResponse.json({ error: 'No active season' }, { status: 400 });
    }

    const currentWeek = await getCurrentWeek(supabase, season.id);
    if (!currentWeek || !currentWeek.transfer_window_open) {
      return NextResponse.json({ error: 'Transfer window is not open' }, { status: 400 });
    }

    // The deadline is enforced, not just displayed (also checked by a DB trigger)
    if (
      currentWeek.transfer_window_closes_at &&
      new Date() > new Date(currentWeek.transfer_window_closes_at)
    ) {
      return NextResponse.json({ error: 'Transfer window has closed' }, { status: 400 });
    }

    // Verify user owns the team and it belongs to the current season
    const { data: team } = await supabase
      .from('fantasy_teams')
      .select('id, user_id, budget_remaining')
      .eq('id', teamId)
      .eq('user_id', authUser.id)
      .eq('season_id', season.id)
      .maybeSingle();

    if (!team) {
      return NextResponse.json({ error: 'Team not found or not owned by user' }, { status: 403 });
    }

    // Fetch current team players for constraint validation
    const { data: currentTeamPlayers, error: teamPlayersError } = await supabase
      .from('fantasy_team_players')
      .select('*, rl_player:rl_players(*)')
      .eq('fantasy_team_id', teamId);

    if (teamPlayersError) {
      console.error('Error fetching team players:', teamPlayersError);
      return NextResponse.json({ error: 'Failed to validate transfer' }, { status: 500 });
    }

    // Fetch the bought player - must be an active player of the current season
    const { data: boughtPlayer, error: boughtPlayerError } = await supabase
      .from('rl_players')
      .select('*')
      .eq('id', boughtPlayerId)
      .eq('season_id', season.id)
      .eq('is_active', true)
      .maybeSingle();

    if (boughtPlayerError || !boughtPlayer) {
      console.error('Error fetching bought player:', boughtPlayerError);
      return NextResponse.json({ error: 'Player not available this season' }, { status: 404 });
    }

    // Get the team player entry being sold (sold price = its purchase price)
    const soldTeamPlayer = currentTeamPlayers?.find(p => p.rl_player_id === soldPlayerId);
    if (!soldTeamPlayer) {
      return NextResponse.json({ error: 'Sold player is not on your team' }, { status: 400 });
    }
    const slotType: SlotType = soldTeamPlayer.slot_type || 'substitute';

    const soldPrice: number = soldTeamPlayer.purchase_price;
    const boughtPrice: number = boughtPlayer.price;

    const newBudget = team.budget_remaining + soldPrice - boughtPrice;
    if (newBudget < 0) {
      return NextResponse.json({ error: 'Not enough budget for this transfer' }, { status: 400 });
    }

    // Validate transfer against team constraints
    const constraintResult = canAddPlayer(
      currentTeamPlayers || [],
      boughtPlayer,
      slotType,
      soldPlayerId
    );

    if (!constraintResult.valid) {
      return NextResponse.json({ error: constraintResult.reason }, { status: 400 });
    }

    // Create transfer record
    const { error: transferError } = await supabase.from('transfers').insert({
      fantasy_team_id: teamId,
      week_id: currentWeek.id,
      sold_player_id: soldPlayerId,
      sold_price: soldPrice,
      bought_player_id: boughtPlayerId,
      bought_price: boughtPrice,
    });

    if (transferError) {
      console.error('Error creating transfer:', transferError);
      return NextResponse.json({ error: transferError.message }, { status: 500 });
    }

    // Update team player
    const { error: updateError } = await supabase
      .from('fantasy_team_players')
      .update({
        rl_player_id: boughtPlayerId,
        purchase_price: boughtPrice,
      })
      .eq('id', teamPlayerId);

    if (updateError) {
      console.error('Error updating team player:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update budget
    await supabase
      .from('fantasy_teams')
      .update({ budget_remaining: newBudget })
      .eq('id', teamId);

    return NextResponse.json({ success: true, newBudget });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
