'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { ArrowRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { PlayerCard } from './PlayerCard';
import type { RLPlayer, FantasyTeamPlayer, RLTeam } from '@/types';
import { RL_TEAMS, RL_TEAM_NAMES } from '@/lib/scoring/constants';
import { canAddPlayer } from '@/lib/fantasy/constraints';

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (sellPlayer: RLPlayer, buyPlayer: RLPlayer) => void;
  teamPlayers: FantasyTeamPlayer[];
  allPlayers: RLPlayer[];
  budget: number;
}

export function TransferModal({
  open,
  onClose,
  onConfirm,
  teamPlayers,
  allPlayers,
  budget,
}: TransferModalProps) {
  const [step, setStep] = useState<'sell' | 'buy'>('sell');
  const [sellPlayer, setSellPlayer] = useState<RLPlayer | null>(null);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<RLTeam | 'all'>('all');

  // Players on the team that can be sold
  const sellablePlayers = teamPlayers
    .filter((p) => p.rl_player)
    .map((p) => p.rl_player!);

  // Calculate budget after selling
  const budgetAfterSale = sellPlayer
    ? budget + teamPlayers.find((p) => p.rl_player_id === sellPlayer.id)?.purchase_price!
    : budget;

  // Get the slot type of the player being sold (for constraint checks)
  const sellPlayerSlotType = sellPlayer
    ? teamPlayers.find((p) => p.rl_player_id === sellPlayer.id)?.slot_type || 'substitute'
    : 'substitute';

  // Available players to buy
  const teamPlayerIds = teamPlayers.map((p) => p.rl_player_id);
  const buyablePlayers = useMemo(() => {
    return allPlayers
      .filter((p) => p.is_active)
      .filter((p) => !teamPlayerIds.includes(p.id) || p.id === sellPlayer?.id)
      .filter((p) => p.id !== sellPlayer?.id) // Can't buy the same player we're selling
      .filter((p) => p.price <= budgetAfterSale)
      .filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.team.toLowerCase().includes(search.toLowerCase())
      )
      .filter((p) => teamFilter === 'all' || p.team === teamFilter)
      .filter((p) => {
        // Check team constraint (max 2 per RL team, max 1 active per RL team)
        // The sold player's ID is passed so they don't count toward the limit
        const result = canAddPlayer(teamPlayers, p, sellPlayerSlotType, sellPlayer?.id);
        return result.valid;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPlayers, teamPlayerIds, sellPlayer, budgetAfterSale, search, teamFilter, teamPlayers, sellPlayerSlotType]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('is-IS').format(price);
  };

  const handleSelectSell = (player: RLPlayer) => {
    setSellPlayer(player);
    setStep('buy');
  };

  const handleSelectBuy = (buyPlayer: RLPlayer) => {
    if (sellPlayer) {
      onConfirm(sellPlayer, buyPlayer);
      handleClose();
    }
  };

  const handleClose = () => {
    setSellPlayer(null);
    setStep('sell');
    setSearch('');
    setTeamFilter('all');
    onClose();
  };

  const handleBack = () => {
    setStep('sell');
    setSearch('');
    setTeamFilter('all');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'sell' ? 'Select Player to Sell' : 'Select Player to Buy'}
          </DialogTitle>
          <DialogDescription>
            {step === 'sell' ? (
              'Choose a player from your team to transfer out'
            ) : (
              <>
                Selling <strong>{sellPlayer?.name}</strong> for{' '}
                {formatPrice(
                  teamPlayers.find((p) => p.rl_player_id === sellPlayer?.id)?.purchase_price || 0
                )}{' '}
                kr • Budget after sale: {formatPrice(budgetAfterSale)} kr
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === 'sell' ? (
          // Sell step - show team players
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              {sellablePlayers.map((player) => {
                const teamPlayer = teamPlayers.find((p) => p.rl_player_id === player.id);
                return (
                  <div
                    key={player.id}
                    className="relative cursor-pointer"
                    onClick={() => handleSelectSell(player)}
                  >
                    <PlayerCard
                      player={player}
                      role={teamPlayer?.role || undefined}
                      subOrder={teamPlayer?.sub_order || undefined}
                    />
                    <div className="absolute bottom-2 left-2 right-2 text-center text-xs bg-background/80 rounded py-1">
                      Sell for {formatPrice(teamPlayer?.purchase_price || 0)} kr
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Buy step - show available players
          <>
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
            </div>

            {/* Player list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {buyablePlayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p>No players available</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
                  {buyablePlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      showPrice
                      onClick={() => handleSelectBuy(player)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <DialogFooter className="pt-4 border-t">
          {step === 'buy' && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
