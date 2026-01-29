'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { RLPlayer, Role, FantasyTeamPlayer } from '@/types';
import { PlayerSlot } from './PlayerSlot';

interface FieldVisualizationProps {
  players: FantasyTeamPlayer[];
  onSlotClick?: (slotType: 'active' | 'substitute', role?: Role, subOrder?: number) => void;
  disabled?: boolean;
  className?: string;
}

export function FieldVisualization({
  players,
  onSlotClick,
  disabled = false,
  className,
}: FieldVisualizationProps) {
  // Get players by position
  const getActivePlayer = (role: Role): RLPlayer | null => {
    const p = players.find((p) => p.slot_type === 'active' && p.role === role);
    return p?.rl_player || null;
  };

  const getSubstitute = (order: number): RLPlayer | null => {
    const p = players.find((p) => p.slot_type === 'substitute' && p.sub_order === order);
    return p?.rl_player || null;
  };

  return (
    <div className={cn('relative w-full max-w-3xl mx-auto', className)}>
      {/* Field background - rotated 180 degrees */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <Image
          src="/field.jpeg"
          alt="Soccer field"
          fill
          className="object-cover rotate-180 opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background/60" />
      </div>

      {/* Content */}
      <div className="relative flex gap-4 p-6">
        {/* Main field area */}
        <div className="flex-1 flex flex-col items-center justify-between py-8 min-h-[400px]">
          {/* Striker - at top */}
          <div className="w-32">
            <PlayerSlot
              role="striker"
              player={getActivePlayer('striker')}
              onClick={() => onSlotClick?.('active', 'striker')}
              disabled={disabled}
            />
          </div>

          {/* Midfield - in middle */}
          <div className="w-32">
            <PlayerSlot
              role="midfield"
              player={getActivePlayer('midfield')}
              onClick={() => onSlotClick?.('active', 'midfield')}
              disabled={disabled}
            />
          </div>

          {/* Goalkeeper - at bottom */}
          <div className="w-32">
            <PlayerSlot
              role="goalkeeper"
              player={getActivePlayer('goalkeeper')}
              onClick={() => onSlotClick?.('active', 'goalkeeper')}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Bench area */}
        <div className="w-32 flex flex-col justify-center gap-4 bg-card/50 rounded-xl p-3 backdrop-blur-sm border border-border">
          <div className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Bench
          </div>
          <PlayerSlot
            subOrder={1}
            player={getSubstitute(1)}
            onClick={() => onSlotClick?.('substitute', undefined, 1)}
            disabled={disabled}
          />
          <PlayerSlot
            subOrder={2}
            player={getSubstitute(2)}
            onClick={() => onSlotClick?.('substitute', undefined, 2)}
            disabled={disabled}
          />
          <PlayerSlot
            subOrder={3}
            player={getSubstitute(3)}
            onClick={() => onSlotClick?.('substitute', undefined, 3)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
