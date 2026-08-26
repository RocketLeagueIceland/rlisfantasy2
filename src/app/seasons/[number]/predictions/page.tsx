import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getSeasonByNumber } from '@/lib/seasons';
import { PredictionsList } from '@/components/predictions/PredictionsList';
import { Card, CardContent } from '@/components/ui/card';
import type { PlayoffPrediction, PlayoffPredictionWithUser } from '@/types/predictions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ number: string }>;
}

interface PredictionRow extends PlayoffPrediction {
  user: { id: string; username: string; avatar_url: string | null } | null;
}

export default async function SeasonPredictionsPage({ params }: Props) {
  const { number } = await params;

  // Predictions are only visible to logged-in users, same as the live page
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect(`/login?next=/seasons/${number}/predictions`);
  }

  const service = createServiceClient();
  const season = await getSeasonByNumber(service, parseInt(number, 10));
  if (!season) notFound();

  const { data: rawPredictions } = await service
    .from('playoff_predictions')
    .select(
      `
        *,
        user:users!inner(id, username, avatar_url)
      `
    )
    .eq('season_id', season.id)
    .order('created_at', { ascending: false });

  const predictions: PlayoffPredictionWithUser[] = ((rawPredictions ?? []) as PredictionRow[])
    .filter((p): p is PredictionRow & { user: NonNullable<PredictionRow['user']> } => p.user !== null)
    .map((p) => {
      const { user, ...rest } = p;
      return { ...rest, user };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Playoff Predictions</h1>
        <p className="text-muted-foreground">
          {season.name} bracket predictions ({predictions.length})
        </p>
      </div>

      {predictions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No predictions were submitted in {season.name}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <PredictionsList predictions={predictions} />
      )}
    </div>
  );
}
