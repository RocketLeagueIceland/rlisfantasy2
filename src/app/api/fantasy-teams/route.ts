import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Fetch user's fantasy team
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ team: null, teamPlayers: [], error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch user's team
    const { data: teamData, error: teamError } = await supabase
      .from('fantasy_teams')
      .select('*')
      .eq('user_id', authUser.id)
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

// POST - Create a new fantasy team
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name, budget_remaining, created_in_week, players } = body;

    // Create the team
    const { data: newTeam, error: teamError } = await supabase
      .from('fantasy_teams')
      .insert({
        user_id: authUser.id,
        name,
        budget_remaining,
        created_in_week,
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
      purchase_price: number;
    }) => ({
      fantasy_team_id: newTeam.id,
      rl_player_id: p.rl_player_id,
      slot_type: p.slot_type,
      role: p.role,
      sub_order: p.sub_order,
      purchase_price: p.purchase_price,
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

// PATCH - Update team name
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
