'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlayerCard } from './PlayerCard';
import type { RLPlayer, Role, RLTeam } from '@/types';
import { RL_TEAMS, RL_TEAM_NAMES, ROLE_INFO } from '@/lib/scoring/constants';

interface PlayerPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (player: RLPlayer) => void;
  players: RLPlayer[];
  selectedPlayerIds: string[];
  budget: number;
  slotType: 'active' | 'substitute';
  role?: Role;
  subOrder?: number;
}

export function PlayerPicker({
  open,
  onClose,
  onSelect,
  players,
  selectedPlayerIds,
  budget,
  slotType,
  role,
  subOrder,
}: PlayerPickerProps) {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<RLTeam | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');

  const availablePlayers = useMemo(() => {
    return players
      .filter((p) => p.is_active)
      .filter((p) => !selectedPlayerIds.includes(p.id))
      .filter((p) => p.price <= budget)
      .filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.team.toLowerCase().includes(search.toLowerCase())
      )
      .filter((p) => teamFilter === 'all' || p.team === teamFilter)
      .sort((a, b) => {
        switch (sortBy) {
          case 'price-asc':
            return a.price - b.price;
          case 'price-desc':
            return b.price - a.price;
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [players, selectedPlayerIds, budget, search, teamFilter, sortBy]);

  const formatBudget = (amount: number) => {
    if (amount >= 1_000_000) {
      const millions = amount / 1_000_000;
      return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
    }
    return new Intl.NumberFormat('is-IS').format(amount);
  };

  const slotLabel = role ? ROLE_INFO[role].name : `Substitute ${subOrder}`;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Player for {slotLabel}</DialogTitle>
          <DialogDescription>
            Budget remaining: {formatBudget(budget)} kr
            {role && (
              <span className="ml-2 text-primary">
                ({ROLE_INFO[role].description})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v as RLTeam | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {RL_TEAMS.map((team) => (
                <SelectItem key={team} value={team}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={`/Teams/${team}.png`}
                      alt={team}
                      width={16}
                      height={16}
                      className="rounded"
                    />
                    {RL_TEAM_NAMES[team]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {availablePlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>No players available</p>
              <p className="text-sm">Try adjusting your filters or budget</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              {availablePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  showPrice
                  onClick={() => {
                    onSelect(player);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
