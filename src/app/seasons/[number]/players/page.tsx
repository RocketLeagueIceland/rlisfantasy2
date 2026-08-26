import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getSeasonByNumber } from '@/lib/seasons';
import { PlayersTable } from '@/components/players/PlayersTable';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ number: string }>;
}

export default async function SeasonPlayersPage({ params }: Props) {
  const { number } = await params;
  const supabase = await createServiceClient();
  const season = await getSeasonByNumber(supabase, parseInt(number, 10));
  if (!season) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="text-muted-foreground">{season.name} player stats</p>
      </div>

      <PlayersTable seasonNumber={season.number} />
    </div>
  );
}
