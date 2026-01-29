'use client';

import Image from 'next/image';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RLPlayer, Role } from '@/types';
import { ROLE_INFO } from '@/lib/scoring/constants';
import { PlayerCard } from './PlayerCard';

interface PlayerSlotProps {
  role?: Role;
  subOrder?: number;
  player?: RLPlayer | null;
  onClick?: () => void;
  disabled?: boolean;
}

export function PlayerSlot({
  role,
  subOrder,
  player,
  onClick,
  disabled = false,
}: PlayerSlotProps) {
  if (player) {
    return (
      <div className="relative">
        <PlayerCard
          player={player}
          role={role}
          subOrder={subOrder}
          onClick={!disabled ? onClick : undefined}
        />
      </div>
    );
  }

  // Empty slot
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all min-h-[120px]',
        disabled
          ? 'border-muted bg-muted/20 cursor-not-allowed'
          : 'border-muted-foreground/30 hover:border-primary/50 cursor-pointer hover:bg-primary/5'
      )}
      onClick={!disabled ? onClick : undefined}
    >
      {/* Role indicator for active slots */}
      {role && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-50">
          <Image
            src={ROLE_INFO[role].icon}
            alt={role}
            width={28}
            height={28}
          />
        </div>
      )}

      {/* Sub order indicator */}
      {subOrder !== undefined && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold opacity-50">
          {subOrder}
        </div>
      )}

      <Plus className="h-8 w-8 text-muted-foreground/50 mb-1" />
      <span className="text-xs text-muted-foreground">
        {role ? ROLE_INFO[role].name : `Sub ${subOrder}`}
      </span>
    </div>
  );
}
