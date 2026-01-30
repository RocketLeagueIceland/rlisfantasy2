'use client';

import Image from 'next/image';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RLPlayer, Role } from '@/types';
import { ROLE_INFO } from '@/lib/scoring/constants';
import { PlayerCard } from './PlayerCard';

interface PlayerSlotProps {
  role?: Role;
  subOrder?: number;
  player?: RLPlayer | null;
  onClick?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export function PlayerSlot({
  role,
  subOrder,
  player,
  onClick,
  onRemove,
  disabled = false,
}: PlayerSlotProps) {
  if (player) {
    return (
      <div className="relative group">
        <PlayerCard
          player={player}
          role={role}
          subOrder={subOrder}
          onClick={!disabled ? onClick : undefined}
        />
        {onRemove && !disabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90 shadow-md"
            title="Remove player"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Empty slot - solid background for visibility
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-2 md:p-4 rounded-xl border-2 transition-all min-h-[80px] md:min-h-[100px]',
        disabled
          ? 'border-muted bg-card/80 cursor-not-allowed'
          : 'border-primary/60 bg-card/90 hover:border-primary hover:bg-card cursor-pointer shadow-lg'
      )}
      onClick={!disabled ? onClick : undefined}
    >
      {/* Role indicator for active slots */}
      {role && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-card rounded-full p-1">
          <Image
            src={ROLE_INFO[role].icon}
            alt={role}
            width={24}
            height={24}
          />
        </div>
      )}

      {/* Sub order indicator */}
      {subOrder !== undefined && (
        <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
          {subOrder}
        </div>
      )}

      <Plus className="h-5 w-5 md:h-6 md:w-6 text-primary mb-1" />
      <span className="text-xs md:text-sm font-medium text-foreground text-center">
        {role ? ROLE_INFO[role].name : `Sub ${subOrder}`}
      </span>
    </div>
  );
}
