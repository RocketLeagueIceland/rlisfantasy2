import { createClient } from '@/lib/supabase/server';
import { getCurrentSeason, getCurrentWeek } from '@/lib/seasons';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const season = await getCurrentSeason(supabase);
    if (!season) {
      return NextResponse.json({ week: null, season: null });
    }

    const week = await getCurrentWeek(supabase, season.id);

    return NextResponse.json({ week, season });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ week: null, error: 'Unexpected error' }, { status: 500 });
  }
}
