'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ArrowUp, ArrowDown, Users, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RL_TEAM_NAMES, ROLE_INFO } from '@/lib/scoring/constants';
import type { Role, SlotType } from '@/types';

interface PlayerWithStats {
  id: string;
  name: string;
  team: string;
  price: number;
  total_goals: number;
  total_assists: number;
  total_saves: number;
  total_shots: number;
  total_demos_received: number;
  games_played: number;
  points_goals: number;
  points_assists: number;
  points_saves: number;
  points_shots: number;
  points_demos: number;
  total_points: number;
  weeks_played: number;
  avg_points_per_week: number;
  ownership_count: number;
  weekly_points: { week_number: number; points: number }[];
}

type SortField =
  | 'team' | 'name' | 'price'
  | 'total_goals' | 'total_assists' | 'total_saves' | 'total_shots' | 'total_demos_received'
  | 'total_points' | 'avg_points_per_week' | 'ownership_count' | 'games_played'
  | `week_${number}`;

const weekSortField = (week: number): SortField => `week_${week}`;

/** Where a player sits on the viewer's own fantasy team. */
interface MySlot {
  slot_type: SlotType;
  role: Role | null;
  sub_order: number | null;
}

function MySlotBadge({ slot }: { slot: MySlot }) {
  if (slot.slot_type === 'active') {
    const roleName = slot.role ? ROLE_INFO[slot.role].name : 'Starter';
    return (
      <Badge variant="default" className="gap-1" title="Starting roster on your team">
        <Star className="h-3 w-3 fill-current" />
        {roleName}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" title="Bench on your team">
      Sub{slot.sub_order ? ` ${slot.sub_order}` : ''}
    </Badge>
  );
}

function PlayerNameCell({ name, slot }: { name: string; slot?: MySlot }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-medium">{name}</span>
      {slot && <MySlotBadge slot={slot} />}
    </div>
  );
}

const weekPointsFor = (player: PlayerWithStats, week: number): number | null =>
  player.weekly_points.find((w) => w.week_number === week)?.points ?? null;

function TeamCell({ team }: { team: string }) {
  return (
    <div className="flex items-center gap-2">
      <Image src={`/Teams/${team}.png`} alt={team} width={24} height={24} className="rounded shrink-0" />
      <span className="text-xs text-muted-foreground hidden sm:inline">{RL_TEAM_NAMES[team]}</span>
    </div>
  );
}

type SortDirection = 'asc' | 'desc';

interface SortHeaderProps {
  field: SortField;
  label: string;
  className?: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortHeader({ field, label, className = '', sortField, sortDirection, onSort }: SortHeaderProps) {
  return (
    <th
      className={`px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        )}
      </div>
    </th>
  );
}

interface PlayersTableProps {
  /** Season number to show; omit for the current season. */
  seasonNumber?: number;
}

export function PlayersTable({ seasonNumber }: PlayersTableProps) {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  // rl_player_id -> slot on the signed-in user's team (current season only)
  const [mySlots, setMySlots] = useState<Map<string, MySlot>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('team');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const url = seasonNumber
          ? `/api/players/stats?season=${seasonNumber}`
          : '/api/players/stats';
        const response = await fetch(url);
        const data = await response.json();
        setPlayers(data.players || []);
      } catch (error) {
        console.error('Error fetching players:', error);
      }
      setLoading(false);
    };

    fetchPlayers();
  }, [seasonNumber]);

  // Archive pages have no "my team"; on the live season, mark the viewer's own players.
  useEffect(() => {
    if (seasonNumber) return;
    let cancelled = false;
    const fetchMyTeam = async () => {
      try {
        const response = await fetch('/api/fantasy-teams');
        if (!response.ok) return; // 401 when signed out
        const data = await response.json();
        const slots = new Map<string, MySlot>();
        for (const tp of data.teamPlayers || []) {
          slots.set(tp.rl_player_id, {
            slot_type: tp.slot_type,
            role: tp.role ?? null,
            sub_order: tp.sub_order ?? null,
          });
        }
        if (!cancelled) setMySlots(slots);
      } catch (error) {
        console.error('Error fetching my team:', error);
      }
    };
    fetchMyTeam();
    return () => {
      cancelled = true;
    };
  }, [seasonNumber]);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    return `${(price / 1000).toFixed(0)}K`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to descending for numeric stats (higher is better, except demos)
      const numericFields: SortField[] = [
        'total_goals', 'total_assists', 'total_saves', 'total_shots',
        'total_points', 'avg_points_per_week', 'ownership_count', 'games_played', 'price'
      ];
      const isNumeric = numericFields.includes(field) || field.startsWith('week_');
      setSortDirection(isNumeric ? 'desc' : 'asc');
    }
  };

  // Every week any player has stats for, ascending
  const allWeeks = useMemo(
    () =>
      [...new Set(players.flatMap((p) => p.weekly_points.map((w) => w.week_number)))].sort(
        (a, b) => a - b
      ),
    [players]
  );

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'team') {
        comparison = a.team.localeCompare(b.team);
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField.startsWith('week_')) {
        const week = parseInt(sortField.slice('week_'.length), 10);
        // Players without a score that week sort to the bottom regardless of direction
        const aPts = weekPointsFor(a, week);
        const bPts = weekPointsFor(b, week);
        if (aPts === null && bPts === null) comparison = 0;
        else if (aPts === null) return 1;
        else if (bPts === null) return -1;
        else comparison = aPts - bPts;
      } else {
        const numericField = sortField as Exclude<SortField, 'team' | 'name' | `week_${number}`>;
        comparison = a[numericField] - b[numericField];
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [players, sortField, sortDirection]);

  const headerProps = { sortField, sortDirection, onSort: handleSort };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Player Stats</CardTitle>
          <CardDescription>
            {players.length} players{seasonNumber ? '' : ' available'}. Click column headers to sort.
            {mySlots.size > 0 && ' Highlighted rows are on your team.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="overall">
            <TabsList className="mx-4 mb-2">
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="weekly">Weekly Breakdown</TabsTrigger>
            </TabsList>
            <TabsContent value="overall">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <SortHeader {...headerProps} field="team" label="Team" className="pl-4 frozen-col frozen-col-1" />
                      <SortHeader {...headerProps} field="name" label="Player" className="frozen-col frozen-col-2" />
                      <SortHeader {...headerProps} field="price" label="Price" />
                      <SortHeader {...headerProps} field="games_played" label="GP" />
                      <SortHeader {...headerProps} field="total_goals" label="Goals" />
                      <SortHeader {...headerProps} field="total_assists" label="Assists" />
                      <SortHeader {...headerProps} field="total_saves" label="Saves" />
                      <SortHeader {...headerProps} field="total_shots" label="Shots" />
                      <SortHeader {...headerProps} field="total_demos_received" label="Demos" />
                      <SortHeader {...headerProps} field="total_points" label="Points" />
                      <SortHeader {...headerProps} field="avg_points_per_week" label="Avg/Week" />
                      <SortHeader {...headerProps} field="ownership_count" label="Owned" className="pr-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedPlayers.map((player) => (
                      <tr
                        key={player.id}
                        className={`hover:bg-muted/50 transition-colors ${
                          mySlots.has(player.id) ? 'on-my-team bg-primary/5' : ''
                        }`}
                      >
                        <td className="px-2 py-3 pl-4 frozen-col frozen-col-1">
                          <TeamCell team={player.team} />
                        </td>
                        <td className="px-2 py-3 frozen-col frozen-col-2">
                          <PlayerNameCell name={player.name} slot={mySlots.get(player.id)} />
                        </td>
                        <td className="px-2 py-3 text-muted-foreground font-mono text-sm">
                          {formatPrice(player.price)}
                        </td>
                        <td className="px-2 py-3 text-center text-muted-foreground">
                          {player.games_played}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="flex flex-col">
                            <span className="font-medium">{player.total_goals}</span>
                            <span className="text-xs text-green-500">+{player.points_goals}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="flex flex-col">
                            <span className="font-medium">{player.total_assists}</span>
                            <span className="text-xs text-green-500">+{player.points_assists}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="flex flex-col">
                            <span className="font-medium">{player.total_saves}</span>
                            <span className="text-xs text-green-500">+{player.points_saves}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="flex flex-col">
                            <span className="font-medium">{player.total_shots}</span>
                            <span className="text-xs text-green-500">+{player.points_shots}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="flex flex-col">
                            <span className="font-medium">{player.total_demos_received}</span>
                            <span className="text-xs text-red-500">{player.points_demos}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-primary">
                          {player.total_points}
                        </td>
                        <td className="px-2 py-3 text-center font-medium text-muted-foreground">
                          {player.weeks_played > 0 ? player.avg_points_per_week.toFixed(1) : '-'}
                        </td>
                        <td className="px-2 py-3 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{player.ownership_count}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="weekly">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <SortHeader {...headerProps} field="team" label="Team" className="pl-4 frozen-col frozen-col-1" />
                      <SortHeader {...headerProps} field="name" label="Player" className="frozen-col frozen-col-2" />
                      <SortHeader {...headerProps} field="total_points" label="Points" />
                      <SortHeader {...headerProps} field="avg_points_per_week" label="Avg/Week" />
                      {allWeeks.map((week, i) => (
                        <SortHeader {...headerProps}
                          key={week}
                          field={weekSortField(week)}
                          label={`W${week}`}
                          className={i === allWeeks.length - 1 ? 'pr-4' : ''}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedPlayers.map((player) => (
                      <tr
                        key={player.id}
                        className={`hover:bg-muted/50 transition-colors ${
                          mySlots.has(player.id) ? 'on-my-team bg-primary/5' : ''
                        }`}
                      >
                        <td className="px-2 py-3 pl-4 frozen-col frozen-col-1">
                          <TeamCell team={player.team} />
                        </td>
                        <td className="px-2 py-3 frozen-col frozen-col-2">
                          <PlayerNameCell name={player.name} slot={mySlots.get(player.id)} />
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-primary">
                          {player.total_points}
                        </td>
                        <td className="px-2 py-3 text-center font-medium text-muted-foreground">
                          {player.weeks_played > 0 ? player.avg_points_per_week.toFixed(1) : '-'}
                        </td>
                        {allWeeks.map((week, i) => {
                          const points = weekPointsFor(player, week);
                          return (
                            <td
                              key={week}
                              className={`px-2 py-3 text-center text-sm ${
                                sortField === weekSortField(week) ? 'bg-muted/40' : ''
                              } ${i === allWeeks.length - 1 ? 'pr-4' : ''}`}
                            >
                              {points === null ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                points
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {allWeeks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No weekly stats yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Points Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Goal: <span className="text-green-500">+50</span></span>
            <span>Assist: <span className="text-green-500">+35</span></span>
            <span>Save: <span className="text-green-500">+25</span></span>
            <span>Shot: <span className="text-green-500">+15</span></span>
            <span>Demo taken: <span className="text-red-500">-15</span></span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Points shown are base points. Role bonuses (2x) are applied based on your team setup.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
