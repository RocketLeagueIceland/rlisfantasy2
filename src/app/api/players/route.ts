import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rl_players')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching players:', error);
      return NextResponse.json({ players: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ players: data || [] });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ players: [], error: 'Unexpected error' }, { status: 500 });
  }
}
