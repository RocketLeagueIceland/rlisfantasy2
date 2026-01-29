import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();

  // Check if any scores have been published
  const { data: publishedWeeks } = await supabase
    .from('weeks')
    .select('id')
    .eq('scores_published', true)
    .limit(1);

  const hasPublishedScores = publishedWeeks && publishedWeeks.length > 0;

  // Redirect based on whether scores exist
  if (hasPublishedScores) {
    redirect('/scoreboard');
  } else {
    redirect('/rules');
  }
}
