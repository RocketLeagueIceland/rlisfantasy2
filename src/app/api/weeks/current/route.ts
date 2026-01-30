import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching current week:', error);
      return NextResponse.json({ week: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ week: data });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ week: null, error: 'Unexpected error' }, { status: 500 });
  }
}
