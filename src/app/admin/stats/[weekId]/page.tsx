'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, CheckCircle, Download, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Week, RLPlayer, PlayerStats, PerGameStats } from '@/types';
import { RL_TEAM_NAMES } from '@/lib/scoring/constants';

interface StatsEntry {
  playerId: string;
  player: RLPlayer;
  gamesPlayed: number;
  totalGoals: number;
  totalAssists: number;
  totalSaves: number;
  totalShots: number;
  totalDemosReceived: number;
}

export default function AdminStatsPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = use(params);
  const router = useRouter();
  const [week, setWeek] = useState<Week | null>(null);
  const [players, setPlayers] = useState<RLPlayer[]>([]);
  const [stats, setStats] = useState<Map<string, StatsEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [unmatchedPlayers, setUnmatchedPlayers] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [weekId]);

  const fetchData = async () => {
    // Fetch week
    const { data: weekData, error: weekError } = await supabase
      .from('weeks')
      .select('*')
      .eq('id', weekId)
      .single();

    if (weekError || !weekData) {
      toast.error('Week not found');
      router.push('/admin/weeks');
      return;
    }
    setWeek(weekData);

    // Fetch players
    const { data: playersData } = await supabase
      .from('rl_players')
      .select('*')
      .eq('is_active', true)
      .order('team')
      .order('name');

    setPlayers(playersData || []);

    // Fetch existing stats
    const { data: statsData } = await supabase
      .from('player_stats')
      .select('*')
      .eq('week_id', weekId);

    // Initialize stats map
    const statsMap = new Map<string, StatsEntry>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (playersData || []).forEach((player: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingStats = statsData?.find((s: any) => s.rl_player_id === player.id);
      statsMap.set(player.id, {
        playerId: player.id,
        player,
        gamesPlayed: existingStats?.games_played || 0,
        totalGoals: existingStats?.total_goals || 0,
        totalAssists: existingStats?.total_assists || 0,
        totalSaves: existingStats?.total_saves || 0,
        totalShots: existingStats?.total_shots || 0,
        totalDemosReceived: existingStats?.total_demos_received || 0,
      });
    });
    setStats(statsMap);
    setLoading(false);
  };

  const updateStat = (
    playerId: string,
    field: keyof StatsEntry,
    value: number
  ) => {
    setStats((prev) => {
      const updated = new Map(prev);
      const entry = updated.get(playerId);
      if (entry) {
        updated.set(playerId, { ...entry, [field]: value });
      }
      return updated;
    });
  };

  const handleSaveStats = async () => {
    setSaving(true);

    // Prepare stats for upsert
    const statsToUpsert = Array.from(stats.values())
      .filter((s) => s.gamesPlayed > 0)
      .map((s) => {
        // Generate per-game stats (simplified - divide totals evenly)
        const perGameStats: PerGameStats[] = [];
        for (let i = 1; i <= s.gamesPlayed; i++) {
          perGameStats.push({
            game_number: i,
            goals: Math.floor(s.totalGoals / s.gamesPlayed),
            assists: Math.floor(s.totalAssists / s.gamesPlayed),
            saves: Math.floor(s.totalSaves / s.gamesPlayed),
            shots: Math.floor(s.totalShots / s.gamesPlayed),
            demos_received: Math.floor(s.totalDemosReceived / s.gamesPlayed),
          });
        }
        // Add remainder to first game
        if (perGameStats.length > 0) {
          perGameStats[0].goals += s.totalGoals % s.gamesPlayed;
          perGameStats[0].assists += s.totalAssists % s.gamesPlayed;
          perGameStats[0].saves += s.totalSaves % s.gamesPlayed;
          perGameStats[0].shots += s.totalShots % s.gamesPlayed;
          perGameStats[0].demos_received += s.totalDemosReceived % s.gamesPlayed;
        }

        return {
          week_id: weekId,
          rl_player_id: s.playerId,
          games_played: s.gamesPlayed,
          total_goals: s.totalGoals,
          total_assists: s.totalAssists,
          total_saves: s.totalSaves,
          total_shots: s.totalShots,
          total_demos_received: s.totalDemosReceived,
          per_game_stats: perGameStats,
        };
      });

    // Delete existing stats for this week
    await supabase.from('player_stats').delete().eq('week_id', weekId);

    // Insert new stats
    if (statsToUpsert.length > 0) {
      const { error } = await supabase.from('player_stats').insert(statsToUpsert);

      if (error) {
        toast.error('Failed to save stats');
        console.error(error);
        setSaving(false);
        return;
      }
    }

    // Mark stats as fetched
    await supabase
      .from('weeks')
      .update({ stats_fetched: true })
      .eq('id', weekId);

    toast.success('Stats saved successfully');
    fetchData();
    setSaving(false);
  };

  const handleFetchFromBallchasing = async () => {
    if (!week?.ballchasing_group_id) {
      toast.error('No ballchasing group ID set for this week');
      return;
    }

    setFetching(true);
    setUnmatchedPlayers([]);

    try {
      const response = await fetch('/api/admin/fetch-ballchasing-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId,
          groupId: week.ballchasing_group_id,
        }),
      });

      const data = await response.json();

      // Handle unmatched players - block until aliases are added
      if (data.error === 'unmatched_players') {
        setUnmatchedPlayers(data.unmatchedPlayers);
        toast.error(`Found ${data.unmatchedPlayers.length} unknown player(s). Add aliases before continuing.`);
        setFetching(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      // Update stats with fetched data
      setStats((prev) => {
        const updated = new Map(prev);
        for (const stat of data.stats) {
          const existing = updated.get(stat.playerId);
          if (existing) {
            updated.set(stat.playerId, {
              ...existing,
              gamesPlayed: stat.gamesPlayed,
              totalGoals: stat.totalGoals,
              totalAssists: stat.totalAssists,
              totalSaves: stat.totalSaves,
              totalShots: stat.totalShots,
              totalDemosReceived: stat.totalDemosReceived,
            });
          }
        }
        return updated;
      });

      toast.success(`Successfully fetched stats for ${data.matchedCount} players`);
    } catch (e) {
      console.error('Error fetching from ballchasing:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to fetch stats');
    }

    setFetching(false);
  };

  const handlePublishScores = async () => {
    if (!week?.stats_fetched) {
      toast.error('Please save stats first');
      return;
    }

    // TODO: Calculate scores for all fantasy teams
    // For now, just mark as published
    const { error } = await supabase
      .from('weeks')
      .update({ scores_published: true })
      .eq('id', weekId);

    if (error) {
      toast.error('Failed to publish scores');
    } else {
      toast.success('Scores published');
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/weeks')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Week {week?.week_number} Stats</h1>
          <p className="text-muted-foreground">
            Enter player statistics for this week
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleFetchFromBallchasing}
            disabled={fetching || !week?.ballchasing_group_id}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            {fetching ? 'Fetching...' : 'Fetch from Ballchasing'}
          </Button>
          <Button onClick={handleSaveStats} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Stats'}
          </Button>
          <Button
            onClick={handlePublishScores}
            disabled={!week?.stats_fetched || week?.scores_published}
            variant={week?.scores_published ? 'secondary' : 'default'}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {week?.scores_published ? 'Published' : 'Publish Scores'}
          </Button>
        </div>
      </div>

      {/* Unmatched players error - blocks fetch until resolved */}
      {unmatchedPlayers.length > 0 && (
        <Card className="border-red-500 bg-red-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Unknown Players Found
            </CardTitle>
            <CardDescription>
              These players from ballchasing don&apos;t match any known player or alias.
              You must add them as aliases before fetching stats.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {unmatchedPlayers.map((name) => (
                <span
                  key={name}
                  className="px-3 py-1.5 bg-red-500/20 rounded-md text-sm font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/players')}
              >
                Go to Players Page to Add Aliases
              </Button>
              <Button
                variant="ghost"
                onClick={() => setUnmatchedPlayers([])}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Player Stats Entry</CardTitle>
          <CardDescription>
            Enter the total stats for each player from the Bo5 series, or fetch from Ballchasing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="w-20">Games</TableHead>
                <TableHead className="w-20">Goals</TableHead>
                <TableHead className="w-20">Assists</TableHead>
                <TableHead className="w-20">Saves</TableHead>
                <TableHead className="w-20">Shots</TableHead>
                <TableHead className="w-20">Demos Recv</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(stats.values()).map((entry) => (
                <TableRow key={entry.playerId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Image
                        src={`/Teams/${entry.player.team}.png`}
                        alt={entry.player.team}
                        width={20}
                        height={20}
                        className="rounded"
                      />
                      <span className="text-xs text-muted-foreground">
                        {RL_TEAM_NAMES[entry.player.team]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.player.name}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={entry.gamesPlayed}
                      onChange={(e) =>
                        updateStat(entry.playerId, 'gamesPlayed', parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={entry.totalGoals}
                      onChange={(e) =>
                        updateStat(entry.playerId, 'totalGoals', parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={entry.totalAssists}
                      onChange={(e) =>
                        updateStat(entry.playerId, 'totalAssists', parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={entry.totalSaves}
                      onChange={(e) =>
                        updateStat(entry.playerId, 'totalSaves', parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={entry.totalShots}
                      onChange={(e) =>
                        updateStat(entry.playerId, 'totalShots', parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={entry.totalDemosReceived}
                      onChange={(e) =>
                        updateStat(entry.playerId, 'totalDemosReceived', parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-8"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
