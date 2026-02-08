import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ scores: [] }, { status: 401 });
    }

    // Get user's team
    const { data: team } = await supabase
      .from('fantasy_teams')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!team) {
      return NextResponse.json({ scores: [] });
    }

    // Fetch weekly scores with week info
    const { data: weeklyScores, error } = await supabase
      .from('weekly_scores')
      .select(`
        *,
        weeks!inner(week_number, scores_published)
      `)
      .eq('fantasy_team_id', team.id)
      .eq('weeks.scores_published', true)
      .order('weeks(week_number)', { ascending: false });

    if (error) {
      console.error('Error fetching scores:', error);
      return NextResponse.json({ scores: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scores: weeklyScores || [] });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ scores: [], error: 'Unexpected error' }, { status: 500 });
  }
}
