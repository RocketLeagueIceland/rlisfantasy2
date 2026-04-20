import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PredictionsPageClient } from './PredictionsPageClient';
import type {
  PlayoffPrediction,
  PlayoffPredictionWithUser,
} from '@/types/predictions';

export const dynamic = 'force-dynamic';

interface PredictionRow extends PlayoffPrediction {
  user: { id: string; username: string; avatar_url: string | null } | null;
}

export default async function PredictionsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login?next=/predictions');
  }

  // Use the service client so we can join `users` — migration 009 locks
  // down the users table to own-profile-only for authenticated clients.
  const service = createServiceClient();

  const { data: currentUserRow } = await service
    .from('users')
    .select('username')
    .eq('id', authUser.id)
    .single();

  const { data: rawPredictions } = await service
    .from('playoff_predictions')
    .select(
      `
        *,
        user:users!inner(id, username, avatar_url)
      `
    )
    .order('created_at', { ascending: false });

  const predictions: PredictionRow[] = (rawPredictions ?? []) as PredictionRow[];

  const ownRow = predictions.find((p) => p.user_id === authUser.id) ?? null;
  const otherRows = predictions.filter((p) => p.user_id !== authUser.id);

  const ownPrediction: PlayoffPrediction | null = ownRow
    ? stripUser(ownRow)
    : null;

  const otherPredictions: PlayoffPredictionWithUser[] = otherRows
    .filter((p): p is PredictionRow & { user: NonNullable<PredictionRow['user']> } =>
      p.user !== null
    )
    .map((p) => ({ ...stripUser(p), user: p.user }));

  return (
    <PredictionsPageClient
      ownPrediction={ownPrediction}
      otherPredictions={otherPredictions}
      currentUsername={currentUserRow?.username ?? 'You'}
    />
  );
}

function stripUser(row: PredictionRow): PlayoffPrediction {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user: _user, ...rest } = row;
  return rest;
}
