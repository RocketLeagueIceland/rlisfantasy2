import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ user: null });
    }

    // Fetch user data from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json({ user: null, error: error.message });
    }

    return NextResponse.json({ user: userData });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ user: null, error: 'Unexpected error' });
  }
}
