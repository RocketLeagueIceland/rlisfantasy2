import type { SupabaseClient } from '@supabase/supabase-js';
import type { Season, Week } from '@/types';

// Shared season/week resolution. "Current week" used to be computed as the
// highest week_number across all weeks in three different places - that
// breaks with multiple seasons, so everything goes through here now.

export async function getCurrentSeason(supabase: SupabaseClient): Promise<Season | null> {
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_current', true)
    .maybeSingle();
  return (data as Season | null) ?? null;
}

export async function getSeasonByNumber(
  supabase: SupabaseClient,
  number: number
): Promise<Season | null> {
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('number', number)
    .maybeSingle();
  return (data as Season | null) ?? null;
}

export async function listSeasons(supabase: SupabaseClient): Promise<Season[]> {
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .order('number', { ascending: false });
  return (data as Season[] | null) ?? [];
}

/**
 * Pre-season = nothing has been locked in yet: no week of the season has hit
 * its transfer deadline or broadcast, and no stats/scores exist. While true,
 * saved teams may be freely re-edited (unlimited changes); the first lock
 * ends it permanently.
 */
export async function isPreSeason(supabase: SupabaseClient, seasonId: string): Promise<boolean> {
  const { data: weeks } = await supabase
    .from('weeks')
    .select('transfer_window_closes_at, broadcast_starts_at, stats_fetched, scores_published')
    .eq('season_id', seasonId);

  const nowMs = Date.now();
  const locked = (weeks ?? []).some(
    (w) =>
      w.stats_fetched ||
      w.scores_published ||
      (w.transfer_window_closes_at && nowMs > new Date(w.transfer_window_closes_at).getTime()) ||
      (w.broadcast_starts_at && nowMs > new Date(w.broadcast_starts_at).getTime())
  );
  return !locked;
}

/** Latest week of the given season (the de-facto "current week" while a season runs). */
export async function getCurrentWeek(
  supabase: SupabaseClient,
  seasonId: string
): Promise<Week | null> {
  const { data } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_id', seasonId)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Week | null) ?? null;
}
