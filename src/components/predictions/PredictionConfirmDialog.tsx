'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PredictionBracket } from './PredictionBracket';
import type { PlayoffPrediction } from '@/types/predictions';
import type { PredictionSubmission } from '@/lib/predictions/schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: PredictionSubmission;
  submitting: boolean;
  onConfirm: () => void;
}

export function PredictionConfirmDialog({
  open,
  onOpenChange,
  values,
  submitting,
  onConfirm,
}: Props) {
  const preview: PlayoffPrediction = {
    id: 'preview',
    user_id: 'preview',
    created_at: new Date().toISOString(),
    ...values,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lock in your prediction?</DialogTitle>
          <DialogDescription>
            These picks are <strong>final</strong>. You will not be able to
            edit or delete them after you submit.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <PredictionBracket mode="view" prediction={preview} />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Lock in prediction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
