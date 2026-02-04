'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ArrowUp, ArrowDown, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RL_TEAM_NAMES } from '@/lib/scoring/constants';

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
  ownership_count: number;
}

type SortField =
  | 'team' | 'name' | 'price'
  | 'total_goals' | 'total_assists' | 'total_saves' | 'total_shots' | 'total_demos_received'
  | 'total_points' | 'ownership_count' | 'games_played';

type SortDirection = 'asc' | 'desc';

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('team');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players/stats');
        const data = await response.json();
        setPlayers(data.players || []);
      } catch (error) {
        console.error('Error fetching players:', error);
      }
      setLoading(false);
    };

    fetchPlayers();
  }, []);

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
        'total_points', 'ownership_count', 'games_played', 'price'
      ];
      setSortDirection(numericFields.includes(field) ? 'desc' : 'asc');
    }
  };

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
      } else {
        comparison = (a[sortField] as number) - (b[sortField] as number);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [players, sortField, sortDirection]);

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="text-muted-foreground">
          All available Rocket League players with their season stats
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Stats</CardTitle>
          <CardDescription>
            {players.length} players available. Click column headers to sort.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <SortHeader field="team" label="Team" className="pl-4" />
                  <SortHeader field="name" label="Player" />
                  <SortHeader field="price" label="Price" />
                  <SortHeader field="games_played" label="GP" />
                  <SortHeader field="total_goals" label="Goals" />
                  <SortHeader field="total_assists" label="Assists" />
                  <SortHeader field="total_saves" label="Saves" />
                  <SortHeader field="total_shots" label="Shots" />
                  <SortHeader field="total_demos_received" label="Demos" />
                  <SortHeader field="total_points" label="Points" />
                  <SortHeader field="ownership_count" label="Owned" className="pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-2 py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <Image
                          src={`/Teams/${player.team}.png`}
                          alt={player.team}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {RL_TEAM_NAMES[player.team]}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 font-medium">{player.name}</td>
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
    </div>
  );
}
