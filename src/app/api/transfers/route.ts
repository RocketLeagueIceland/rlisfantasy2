import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
      weekId,
      soldPlayerId,
      soldPrice,
      boughtPlayerId,
      boughtPrice,
      teamPlayerId,
      currentBudget,
    } = body;

    // Verify user owns the team
    const { data: team } = await supabase
      .from('fantasy_teams')
      .select('id, user_id')
      .eq('id', teamId)
      .eq('user_id', authUser.id)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'Team not found or not owned by user' }, { status: 403 });
    }

    // Create transfer record
    const { error: transferError } = await supabase.from('transfers').insert({
      fantasy_team_id: teamId,
      week_id: weekId,
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
    const newBudget = currentBudget + soldPrice - boughtPrice;
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
