import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { getSeasonByNumber } from '@/lib/seasons';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function SeasonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const seasonNumber = parseInt(number, 10);
  if (Number.isNaN(seasonNumber)) notFound();

  const supabase = await createServiceClient();
  const season = await getSeasonByNumber(supabase, seasonNumber);
  if (!season) notFound();

  const base = `/seasons/${season.number}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 border-b pb-4">
        <Link
          href="/seasons"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Past Seasons
        </Link>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{season.name}</h2>
          {!season.is_current && <Badge variant="secondary">Archived</Badge>}
        </div>
        <nav className="flex items-center gap-4 ml-auto text-sm font-medium">
          <Link href={`${base}/scoreboard`} className="text-muted-foreground hover:text-primary transition-colors">
            Scoreboard
          </Link>
          <Link href={`${base}/players`} className="text-muted-foreground hover:text-primary transition-colors">
            Players
          </Link>
          <Link href={`${base}/schedule`} className="text-muted-foreground hover:text-primary transition-colors">
            Schedule
          </Link>
          <Link href={`${base}/predictions`} className="text-muted-foreground hover:text-primary transition-colors">
            Predictions
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
