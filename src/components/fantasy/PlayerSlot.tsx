'use client';

import Image from 'next/image';
import { Plus, X } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
  // Drag and drop props
  slotId?: string;
  playerId?: string;
  isDragEnabled?: boolean;
  isOver?: boolean;
  isValidDrop?: boolean;
  isDragging?: boolean;
}

export function PlayerSlot({
  role,
  subOrder,
  player,
  onClick,
  onRemove,
  disabled = false,
  slotId,
  playerId,
  isDragEnabled = false,
  isOver = false,
  isValidDrop = true,
  isDragging = false,
}: PlayerSlotProps) {
  // Set up draggable - only if player exists and drag is enabled
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging: isDraggingLocal,
  } = useDraggable({
    id: slotId || 'slot',
    data: { playerId, slotId, role, subOrder },
    disabled: !isDragEnabled || !player,
  });

  // Set up droppable - only if drag is enabled
  const { setNodeRef: setDropRef, isOver: isOverLocal } = useDroppable({
    id: slotId || 'slot',
    data: { playerId, slotId, role, subOrder },
    disabled: !isDragEnabled,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDraggingLocal ? 50 : undefined,
      }
    : undefined;

  // Combine refs for both draggable and droppable on the same element
  const setRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  // Determine visual states
  const showIsOver = isOver || isOverLocal;
  const showIsDragging = isDragging || isDraggingLocal;

  if (player) {
    return (
      <div
        ref={isDragEnabled ? setRef : undefined}
        style={style}
        {...(isDragEnabled ? { ...attributes, ...listeners } : {})}
        className={cn(
          'relative group',
          isDragEnabled && 'touch-none cursor-grab active:cursor-grabbing',
          showIsDragging && 'opacity-50 cursor-grabbing',
          showIsOver && isValidDrop && 'ring-2 ring-green-500 ring-offset-2 rounded-xl',
          showIsOver && !isValidDrop && 'ring-2 ring-red-500 ring-offset-2 rounded-xl'
        )}
      >
        <PlayerCard
          player={player}
          role={role}
          subOrder={subOrder}
          onClick={!disabled && !isDragEnabled ? onClick : undefined}
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
      ref={isDragEnabled ? setRef : undefined}
      className={cn(
        'relative flex flex-col items-center justify-center p-2 md:p-4 rounded-xl border-2 transition-all min-h-[80px] md:min-h-[100px]',
        disabled
          ? 'border-muted bg-card/80 cursor-not-allowed'
          : 'border-primary/60 bg-card/90 hover:border-primary hover:bg-card cursor-pointer shadow-lg',
        showIsOver && isValidDrop && 'ring-2 ring-green-500 ring-offset-2 border-green-500',
        showIsOver && !isValidDrop && 'ring-2 ring-red-500 ring-offset-2 border-red-500'
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
