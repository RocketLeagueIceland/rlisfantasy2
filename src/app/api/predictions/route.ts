import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { predictionSchema } from '@/lib/predictions/schema';
import { isDeadlinePassed } from '@/lib/predictions/helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (isDeadlinePassed()) {
      return NextResponse.json({ error: 'Predictions are closed' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = predictionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid submission', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('playoff_predictions')
      .insert({ user_id: authUser.id, ...parsed.data })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You have already submitted a prediction' },
          { status: 409 }
        );
      }
      console.error('Error creating prediction:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prediction: data }, { status: 201 });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
