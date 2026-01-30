'use client';

import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_BUDGET } from '@/lib/scoring/constants';

interface BudgetDisplayProps {
  budget: number;
  className?: string;
}

export function BudgetDisplay({ budget, className }: BudgetDisplayProps) {
  const formatBudget = (amount: number) => {
    if (amount >= 1_000_000) {
      const millions = amount / 1_000_000;
      return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
    }
    return new Intl.NumberFormat('is-IS').format(amount);
  };

  const percentUsed = ((INITIAL_BUDGET - budget) / INITIAL_BUDGET) * 100;
  const isLow = budget < 10_000_000;

  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-lg bg-card border', className)}>
      <div className={cn(
        'p-2 rounded-full',
        isLow ? 'bg-destructive/20' : 'bg-primary/20'
      )}>
        <Wallet className={cn(
          'h-5 w-5',
          isLow ? 'text-destructive' : 'text-primary'
        )} />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Budget</span>
          <span className={cn(
            'text-lg font-bold',
            isLow && 'text-destructive'
          )}>
            {formatBudget(budget)} kr
          </span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isLow ? 'bg-destructive' : 'bg-primary'
            )}
            style={{ width: `${100 - percentUsed}%` }}
          />
        </div>
      </div>
    </div>
  );
}
