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
    <div className={cn('flex flex-col md:flex-row gap-4 w-full max-w-4xl mx-auto overflow-hidden', className)}>
      {/* Field with background */}
      <div className="relative flex-1 rounded-2xl overflow-hidden bg-background aspect-[3/4] md:aspect-[3/4]">
        {/* Field background - rotated 90 degrees so goals are top/bottom */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[133%] h-[75%] origin-center rotate-90">
            <Image
              src="/field.jpeg"
              alt="Soccer field"
              fill
              className="object-contain"
            />
          </div>
          <div className="absolute inset-0 bg-background/50" />
        </div>

        {/* Active players on field */}
        <div className="relative flex flex-col items-center justify-center gap-8 md:gap-16 py-8 md:py-16 px-4 md:px-6 h-full">
          {/* Striker - at top (attacking end) */}
          <div className="w-28 md:w-32">
            <PlayerSlot
              role="striker"
              player={getActivePlayer('striker')}
              onClick={() => onSlotClick?.('active', 'striker')}
              disabled={disabled}
            />
          </div>

          {/* Midfield - in middle */}
          <div className="w-28 md:w-32">
            <PlayerSlot
              role="midfield"
              player={getActivePlayer('midfield')}
              onClick={() => onSlotClick?.('active', 'midfield')}
              disabled={disabled}
            />
          </div>

          {/* Goalkeeper - at bottom (defensive end) */}
          <div className="w-28 md:w-32">
            <PlayerSlot
              role="goalkeeper"
              player={getActivePlayer('goalkeeper')}
              onClick={() => onSlotClick?.('active', 'goalkeeper')}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Bench area - below field on mobile, right side on desktop */}
      <div className="flex flex-col md:w-36 gap-2 md:gap-3 bg-card rounded-xl p-3 md:p-4 border border-border">
        <div className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b border-border">
          Bench
        </div>
        <div className="flex flex-row md:flex-col gap-2 md:gap-3 flex-1 justify-center">
          <div className="flex-1 md:flex-none min-w-0">
            <PlayerSlot
              subOrder={1}
              player={getSubstitute(1)}
              onClick={() => onSlotClick?.('substitute', undefined, 1)}
              disabled={disabled}
            />
          </div>
          <div className="flex-1 md:flex-none min-w-0">
            <PlayerSlot
              subOrder={2}
              player={getSubstitute(2)}
              onClick={() => onSlotClick?.('substitute', undefined, 2)}
              disabled={disabled}
            />
          </div>
          <div className="flex-1 md:flex-none min-w-0">
            <PlayerSlot
              subOrder={3}
              player={getSubstitute(3)}
              onClick={() => onSlotClick?.('substitute', undefined, 3)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
