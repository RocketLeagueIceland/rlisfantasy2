'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { RLPlayer, Role } from '@/types';
import { RL_TEAM_NAMES, ROLE_INFO } from '@/lib/scoring/constants';

interface PlayerCardProps {
  player: RLPlayer;
  role?: Role;
  subOrder?: number;
  showPrice?: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function PlayerCard({
  player,
  role,
  subOrder,
  showPrice = false,
  selected = false,
  onClick,
  compact = false,
}: PlayerCardProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    return `${(price / 1000).toFixed(0)}K`;
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border transition-colors',
          selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <Image
          src={`/Teams/${player.team}.png`}
          alt={player.team}
          width={24}
          height={24}
          className="rounded"
        />
        <span className="font-medium text-sm">{player.name}</span>
        {showPrice && (
          <span className="ml-auto text-xs text-muted-foreground">
            {formatPrice(player.price)} kr
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col items-center p-3 rounded-xl border-2 transition-all',
        'bg-card/80 backdrop-blur-sm',
        selected ? 'border-primary shadow-lg shadow-primary/20' : 'border-border',
        onClick && 'cursor-pointer hover:border-primary/50 hover:scale-105'
      )}
      onClick={onClick}
    >
      {/* Role or Sub indicator */}
      {role && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Image
            src={ROLE_INFO[role].icon}
            alt={role}
            width={28}
            height={28}
            className="drop-shadow-md"
          />
        </div>
      )}
      {subOrder !== undefined && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
          {subOrder}
        </div>
      )}

      {/* Team logo */}
      <div className="w-12 h-12 relative mb-1">
        <Image
          src={`/Teams/${player.team}.png`}
          alt={player.team}
          fill
          className="object-contain"
        />
      </div>

      {/* Player name */}
      <span className="font-semibold text-sm text-center line-clamp-1">
        {player.name}
      </span>

      {/* Team name */}
      <span className="text-xs text-muted-foreground">
        {RL_TEAM_NAMES[player.team]}
      </span>

      {/* Price */}
      {showPrice && (
        <span className="text-xs font-medium text-primary mt-1">
          {formatPrice(player.price)} kr
        </span>
      )}
    </div>
  );
}
