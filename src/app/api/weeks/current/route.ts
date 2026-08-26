import { createClient } from '@/lib/supabase/server';
import { getCurrentSeason, getCurrentWeek, isPreSeason } from '@/lib/seasons';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const season = await getCurrentSeason(supabase);
    if (!season) {
      return NextResponse.json({ week: null, season: null, preSeason: false });
    }

    const [week, preSeason] = await Promise.all([
      getCurrentWeek(supabase, season.id),
      isPreSeason(supabase, season.id),
    ]);

    return NextResponse.json({ week, season, preSeason });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ week: null, error: 'Unexpected error' }, { status: 500 });
  }
}
