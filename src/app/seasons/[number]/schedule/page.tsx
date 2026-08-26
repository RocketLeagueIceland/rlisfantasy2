import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getSeasonByNumber } from '@/lib/seasons';
import { getScheduleWithScores, getSeasonSchedule } from '@/lib/liquipedia/schedule';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ number: string }>;
}

export default async function SeasonSchedulePage({ params }: Props) {
  const { number } = await params;
  const supabase = await createServiceClient();
  const season = await getSeasonByNumber(supabase, parseInt(number, 10));
  if (!season) notFound();

  const config = getSeasonSchedule(season.number);
  const schedule = await getScheduleWithScores(season.number);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Schedule</h1>
        <p className="text-muted-foreground">
          {config?.subtitle ?? `RLIS ${season.name}`}
        </p>
      </div>

      {schedule ? (
        <ScheduleView schedule={schedule} />
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No schedule is archived for {season.name}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
