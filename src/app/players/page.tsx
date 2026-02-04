'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RL_TEAM_NAMES, RL_TEAMS } from '@/lib/scoring/constants';
import type { RLPlayer } from '@/types';

type SortField = 'team' | 'name' | 'price';
type SortDirection = 'asc' | 'desc';

export default function PlayersPage() {
  const [players, setPlayers] = useState<RLPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('team');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players');
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
      return `${(price / 1000000).toFixed(1)}M kr`;
    }
    return `${(price / 1000).toFixed(0)}K kr`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'team') {
        // Sort by team first, then by name
        const teamIndexA = RL_TEAMS.indexOf(a.team);
        const teamIndexB = RL_TEAMS.indexOf(b.team);
        comparison = teamIndexA - teamIndexB;
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'price') {
        comparison = a.price - b.price;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [players, sortField, sortDirection]);

  // Group players by team for the grouped view
  const playersByTeam = useMemo(() => {
    const grouped: Record<string, RLPlayer[]> = {};
    for (const team of RL_TEAMS) {
      grouped[team] = sortedPlayers.filter(p => p.team === team);
    }
    return grouped;
  }, [sortedPlayers]);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant={sortField === field ? 'secondary' : 'ghost'}
      size="sm"
      onClick={() => handleSort(field)}
      className="gap-1"
    >
      {label}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </Button>
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
          All available Rocket League players for your fantasy team
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Player List</CardTitle>
              <CardDescription>{players.length} players available</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <SortButton field="team" label="Team" />
              <SortButton field="name" label="Name" />
              <SortButton field="price" label="Price" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortField === 'team' ? (
            // Grouped by team view
            <div className="space-y-6">
              {RL_TEAMS.map((team) => (
                <div key={team}>
                  <div className="flex items-center gap-3 mb-3">
                    <Image
                      src={`/Teams/${team}.png`}
                      alt={team}
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <h3 className="font-semibold text-lg">{RL_TEAM_NAMES[team]}</h3>
                  </div>
                  <div className="grid gap-2">
                    {playersByTeam[team].map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{player.name}</span>
                        <span className="text-muted-foreground font-mono">
                          {formatPrice(player.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Flat list view for name/price sorting
            <div className="grid gap-2">
              {sortedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={`/Teams/${player.team}.png`}
                      alt={player.team}
                      width={28}
                      height={28}
                      className="rounded"
                    />
                    <div>
                      <span className="font-medium">{player.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {RL_TEAM_NAMES[player.team]}
                      </span>
                    </div>
                  </div>
                  <span className="text-muted-foreground font-mono">
                    {formatPrice(player.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
