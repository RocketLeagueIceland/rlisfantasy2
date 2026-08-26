import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSeason } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();

  // Check if the current season has any published scores
  const season = await getCurrentSeason(supabase);

  let hasPublishedScores = false;
  if (season) {
    const { data: publishedWeeks } = await supabase
      .from('weeks')
      .select('id')
      .eq('season_id', season.id)
      .eq('scores_published', true)
      .limit(1);
    hasPublishedScores = !!publishedWeeks && publishedWeeks.length > 0;
  }

  // Redirect based on whether scores exist
  if (hasPublishedScores) {
    redirect('/scoreboard');
  } else {
    redirect('/rules');
  }
}
