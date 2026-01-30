'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { RLPlayer, Role, FantasyTeamPlayer } from '@/types';
import { PlayerSlot } from './PlayerSlot';
import { canSwapPlayers, canMoveToEmptySlot } from '@/lib/fantasy/constraints';

interface FieldVisualizationProps {
  players: FantasyTeamPlayer[];
  onSlotClick?: (slotType: 'active' | 'substitute', role?: Role, subOrder?: number) => void;
  onRemovePlayer?: (slotType: 'active' | 'substitute', role?: Role, subOrder?: number) => void;
  onSwapPlayers?: (player1Id: string, player2Id: string) => void;
  onMovePlayer?: (playerId: string, targetSlotType: 'active' | 'substitute', targetRole?: Role, targetSubOrder?: number) => void;
  disabled?: boolean;
  className?: string;
}

// Parse slot ID to get slot info
function parseSlotId(slotId: string): { slotType: 'active' | 'substitute'; role?: Role; subOrder?: number } {
  if (slotId.startsWith('active-')) {
    const role = slotId.replace('active-', '') as Role;
    return { slotType: 'active', role };
  }
  const subOrder = parseInt(slotId.replace('substitute-', ''), 10);
  return { slotType: 'substitute', subOrder };
}

// Generate unique slot IDs
function getSlotId(slotType: 'active' | 'substitute', role?: Role, subOrder?: number): string {
  if (slotType === 'active' && role) {
    return `active-${role}`;
  }
  return `substitute-${subOrder}`;
}

export function FieldVisualization({
  players,
  onSlotClick,
  onRemovePlayer,
  onSwapPlayers,
  onMovePlayer,
  disabled = false,
  className,
}: FieldVisualizationProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure sensors for mouse and touch
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Small drag distance before activating
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // Delay before drag starts on touch
      tolerance: 5,
    },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Get players by position
  const getActivePlayer = (role: Role): RLPlayer | null => {
    const p = players.find((p) => p.slot_type === 'active' && p.role === role);
    return p?.rl_player || null;
  };

  const getSubstitute = (order: number): RLPlayer | null => {
    const p = players.find((p) => p.slot_type === 'substitute' && p.sub_order === order);
    return p?.rl_player || null;
  };

  // Get player ID from slot
  const getPlayerIdForSlot = (slotId: string): string | undefined => {
    if (slotId.startsWith('active-')) {
      const role = slotId.replace('active-', '') as Role;
      const player = players.find((p) => p.slot_type === 'active' && p.role === role);
      return player?.rl_player_id || player?.rl_player?.id;
    } else if (slotId.startsWith('substitute-')) {
      const subOrder = parseInt(slotId.replace('substitute-', ''), 10);
      const player = players.find((p) => p.slot_type === 'substitute' && p.sub_order === subOrder);
      return player?.rl_player_id || player?.rl_player?.id;
    }
    return undefined;
  };

  // Check if a swap or move would be valid
  const isValidDrop = useCallback(
    (sourceId: string, targetId: string): boolean => {
      const sourcePlayerId = getPlayerIdForSlot(sourceId);
      const targetPlayerId = getPlayerIdForSlot(targetId);

      if (!sourcePlayerId) {
        return false; // Can't drag from empty slot
      }

      if (targetPlayerId) {
        // Swapping with another player
        const result = canSwapPlayers(players, sourcePlayerId, targetPlayerId);
        return result.valid;
      } else {
        // Moving to empty slot
        const { slotType } = parseSlotId(targetId);
        const result = canMoveToEmptySlot(players, sourcePlayerId, slotType);
        return result.valid;
      }
    },
    [players]
  );

  // Drag event handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | null;
    setOverId(overId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const sourceId = active.id as string;
    const targetId = over.id as string;
    const sourcePlayerId = getPlayerIdForSlot(sourceId);
    const targetPlayerId = getPlayerIdForSlot(targetId);

    if (!sourcePlayerId) {
      return; // Can't drag from empty slot
    }

    // Check if drop is valid
    if (!isValidDrop(sourceId, targetId)) {
      return; // Invalid drop - the visual feedback already showed red
    }

    if (targetPlayerId) {
      // Swap with another player
      onSwapPlayers?.(sourcePlayerId, targetPlayerId);
    } else {
      // Move to empty slot
      const { slotType, role, subOrder } = parseSlotId(targetId);
      onMovePlayer?.(sourcePlayerId, slotType, role, subOrder);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  // Check if a specific slot is being dragged or is a valid drop target
  const getSlotState = (slotId: string) => {
    const isDragging = activeId === slotId;
    const isOver = overId === slotId && activeId !== slotId;
    const canDrop = activeId && overId === slotId ? isValidDrop(activeId, slotId) : true;

    return { isDragging, isOver, isValidDrop: canDrop };
  };

  // Determine if drag should be enabled
  const isDragEnabled = (!!onSwapPlayers || !!onMovePlayer) && players.length >= 1;

  // Render content wrapped in DndContext if drag is enabled
  const content = (
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
            {(() => {
              const slotId = getSlotId('active', 'striker');
              const state = getSlotState(slotId);
              const player = getActivePlayer('striker');
              return (
                <PlayerSlot
                  role="striker"
                  player={player}
                  onClick={() => onSlotClick?.('active', 'striker')}
                  onRemove={onRemovePlayer ? () => onRemovePlayer('active', 'striker') : undefined}
                  disabled={disabled}
                  slotId={slotId}
                  playerId={player?.id}
                  isDragEnabled={isDragEnabled}
                  isDragging={state.isDragging}
                  isOver={state.isOver}
                  isValidDrop={state.isValidDrop}
                />
              );
            })()}
          </div>

          {/* Midfield - in middle */}
          <div className="w-28 md:w-32">
            {(() => {
              const slotId = getSlotId('active', 'midfield');
              const state = getSlotState(slotId);
              const player = getActivePlayer('midfield');
              return (
                <PlayerSlot
                  role="midfield"
                  player={player}
                  onClick={() => onSlotClick?.('active', 'midfield')}
                  onRemove={onRemovePlayer ? () => onRemovePlayer('active', 'midfield') : undefined}
                  disabled={disabled}
                  slotId={slotId}
                  playerId={player?.id}
                  isDragEnabled={isDragEnabled}
                  isDragging={state.isDragging}
                  isOver={state.isOver}
                  isValidDrop={state.isValidDrop}
                />
              );
            })()}
          </div>

          {/* Goalkeeper - at bottom (defensive end) */}
          <div className="w-28 md:w-32">
            {(() => {
              const slotId = getSlotId('active', 'goalkeeper');
              const state = getSlotState(slotId);
              const player = getActivePlayer('goalkeeper');
              return (
                <PlayerSlot
                  role="goalkeeper"
                  player={player}
                  onClick={() => onSlotClick?.('active', 'goalkeeper')}
                  onRemove={onRemovePlayer ? () => onRemovePlayer('active', 'goalkeeper') : undefined}
                  disabled={disabled}
                  slotId={slotId}
                  playerId={player?.id}
                  isDragEnabled={isDragEnabled}
                  isDragging={state.isDragging}
                  isOver={state.isOver}
                  isValidDrop={state.isValidDrop}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* Bench area - below field on mobile, right side on desktop */}
      <div className="flex flex-col md:w-36 gap-2 md:gap-3 bg-card rounded-xl p-3 md:p-4 border border-border">
        <div className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b border-border">
          Bench
        </div>
        <div className="flex flex-row md:flex-col gap-2 md:gap-3 flex-1 justify-center">
          {[1, 2, 3].map((order) => {
            const slotId = getSlotId('substitute', undefined, order);
            const state = getSlotState(slotId);
            const player = getSubstitute(order);
            return (
              <div key={order} className="flex-1 md:flex-none min-w-0">
                <PlayerSlot
                  subOrder={order}
                  player={player}
                  onClick={() => onSlotClick?.('substitute', undefined, order)}
                  onRemove={onRemovePlayer ? () => onRemovePlayer('substitute', undefined, order) : undefined}
                  disabled={disabled}
                  slotId={slotId}
                  playerId={player?.id}
                  isDragEnabled={isDragEnabled}
                  isDragging={state.isDragging}
                  isOver={state.isOver}
                  isValidDrop={state.isValidDrop}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Wrap in DndContext if drag is enabled
  if (isDragEnabled) {
    return (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {content}
      </DndContext>
    );
  }

  return content;
}
