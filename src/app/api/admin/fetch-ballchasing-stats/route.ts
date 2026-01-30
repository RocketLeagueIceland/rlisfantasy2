import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { parseGroupStats } from '@/lib/ballchasing/client';
import { matchPlayerStats, getUnmatchedPlayerNames } from '@/lib/ballchasing/player-matcher';
import type { RLPlayer } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', authUser.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { weekId, groupId } = body;

    if (!weekId || !groupId) {
      return NextResponse.json({ error: 'weekId and groupId are required' }, { status: 400 });
    }

    // Fetch all registered players
    const { data: playersData, error: playersError } = await supabase
      .from('rl_players')
      .select('*')
      .eq('is_active', true);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    const registeredPlayers = playersData as RLPlayer[];

    // Fetch stats from ballchasing
    console.log('[FetchStats] Fetching stats from ballchasing group:', groupId);
    const parsedStats = await parseGroupStats(groupId);
    console.log('[FetchStats] Got stats for', parsedStats.size, 'players from ballchasing');

    // Match players using names and aliases
    const matchedStats = matchPlayerStats(parsedStats, registeredPlayers);
    console.log('[FetchStats] Matched', matchedStats.size, 'players');

    // Get unmatched player names for admin review
    const unmatchedNames = getUnmatchedPlayerNames(parsedStats, registeredPlayers);
    console.log('[FetchStats] Unmatched players:', unmatchedNames);

    // Convert to response format
    const statsResult = Array.from(matchedStats.entries()).map(([playerId, { player, stats }]) => ({
      playerId,
      playerName: player.name,
      playerTeam: player.team,
      gamesPlayed: stats.gamesPlayed,
      totalGoals: stats.totals.goals,
      totalAssists: stats.totals.assists,
      totalSaves: stats.totals.saves,
      totalShots: stats.totals.shots,
      totalDemosReceived: stats.totals.demosReceived,
      perGameStats: stats.perGameStats,
    }));

    return NextResponse.json({
      success: true,
      stats: statsResult,
      unmatchedPlayers: unmatchedNames,
      matchedCount: matchedStats.size,
      totalFromBallchasing: parsedStats.size,
    });
  } catch (e) {
    console.error('[FetchStats] Error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
