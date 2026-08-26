import { createClient } from '@/lib/supabase/server';
import { getCurrentSeason, getCurrentWeek } from '@/lib/seasons';
import { NextResponse } from 'next/server';
import { validateTeamConstraints } from '@/lib/fantasy/constraints';
import type { RLPlayer, SlotType } from '@/types';

export const dynamic = 'force-dynamic';

// GET - Fetch user's fantasy team for the current season
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ team: null, teamPlayers: [], error: 'Not authenticated' }, { status: 401 });
    }

    const season = await getCurrentSeason(supabase);
    if (!season) {
      return NextResponse.json({ team: null, teamPlayers: [] });
    }

    // Fetch user's team for the current season
    const { data: teamData, error: teamError } = await supabase
      .from('fantasy_teams')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('season_id', season.id)
      .maybeSingle();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      return NextResponse.json({ team: null, teamPlayers: [], error: teamError.message }, { status: 500 });
    }

    if (!teamData) {
      return NextResponse.json({ team: null, teamPlayers: [] });
    }

    // Fetch team players with rl_player data
    const { data: teamPlayersData, error: playersError } = await supabase
      .from('fantasy_team_players')
      .select('*, rl_player:rl_players(*)')
      .eq('fantasy_team_id', teamData.id);

    if (playersError) {
      console.error('Error fetching team players:', playersError);
      return NextResponse.json({ team: teamData, teamPlayers: [], error: playersError.message }, { status: 500 });
    }

    return NextResponse.json({ team: teamData, teamPlayers: teamPlayersData || [] });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ team: null, teamPlayers: [], error: 'Unexpected error' }, { status: 500 });
  }
}

// POST - Create a new fantasy team in the current season
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const season = await getCurrentSeason(supabase);
    if (!season) {
      return NextResponse.json({ error: 'No active season' }, { status: 400 });
    }

    const body = await request.json();
    const { name, players } = body;

    // Fetch RL player data for validation and pricing. Prices, budget and the
    // season are resolved server-side - never trusted from the request body.
    const playerIds = players.map((p: { rl_player_id: string }) => p.rl_player_id);
    const { data: rlPlayers, error: rlPlayersError } = await supabase
      .from('rl_players')
      .select('*')
      .in('id', playerIds)
      .eq('season_id', season.id)
      .eq('is_active', true);

    if (rlPlayersError) {
      console.error('Error fetching RL players:', rlPlayersError);
      return NextResponse.json({ error: 'Failed to validate players' }, { status: 500 });
    }

    if (!rlPlayers || rlPlayers.length !== playerIds.length) {
      return NextResponse.json(
        { error: 'One or more players are not available this season' },
        { status: 400 }
      );
    }

    // Build team players with rl_player data for validation
    const teamPlayersForValidation = players.map((p: {
      rl_player_id: string;
      slot_type: SlotType;
    }) => ({
      slot_type: p.slot_type,
      rl_player: rlPlayers.find((rp: RLPlayer) => rp.id === p.rl_player_id),
    }));

    // Validate team constraints (max 2 per RL team, max 1 active per RL team)
    const constraintResult = validateTeamConstraints(teamPlayersForValidation);
    if (!constraintResult.valid) {
      return NextResponse.json({ error: constraintResult.reason }, { status: 400 });
    }

    const priceById = new Map<string, number>(rlPlayers.map((rp: RLPlayer) => [rp.id, rp.price]));
    const totalCost = playerIds.reduce((sum: number, id: string) => sum + (priceById.get(id) || 0), 0);
    const budgetRemaining = season.initial_budget - totalCost;

    if (budgetRemaining < 0) {
      return NextResponse.json({ error: 'Team exceeds the season budget' }, { status: 400 });
    }

    const currentWeek = await getCurrentWeek(supabase, season.id);

    // Create the team
    const { data: newTeam, error: teamError } = await supabase
      .from('fantasy_teams')
      .insert({
        user_id: authUser.id,
        name,
        season_id: season.id,
        budget_remaining: budgetRemaining,
        created_in_week: currentWeek?.week_number || 1,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      return NextResponse.json({ error: teamError.message }, { status: 500 });
    }

    // Insert team players
    const playersToInsert = players.map((p: {
      rl_player_id: string;
      slot_type: string;
      role: string | null;
      sub_order: number | null;
    }) => ({
      fantasy_team_id: newTeam.id,
      rl_player_id: p.rl_player_id,
      slot_type: p.slot_type,
      role: p.role,
      sub_order: p.sub_order,
      purchase_price: priceById.get(p.rl_player_id) || 0,
    }));

    const { error: playersError } = await supabase
      .from('fantasy_team_players')
      .insert(playersToInsert);

    if (playersError) {
      console.error('Error inserting team players:', playersError);
      return NextResponse.json({ error: playersError.message }, { status: 500 });
    }

    return NextResponse.json({ team: newTeam });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// PATCH - Update team name (RLS restricts this to own teams in the current season)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, name } = body;

    const { error } = await supabase
      .from('fantasy_teams')
      .update({ name })
      .eq('id', teamId)
      .eq('user_id', authUser.id); // Ensure user owns the team

    if (error) {
      console.error('Error updating team:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
