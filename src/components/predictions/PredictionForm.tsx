'use client';

import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PredictionBracket } from './PredictionBracket';
import { PredictionConfirmDialog } from './PredictionConfirmDialog';
import { predictionSchema, type PredictionSubmission } from '@/lib/predictions/schema';
import {
  formatDeadline,
  getSf1Loser,
  getSf2Loser,
  isDeadlinePassed,
} from '@/lib/predictions/helpers';

type FormValues = Partial<PredictionSubmission>;

export function PredictionForm() {
  const router = useRouter();
  const methods = useForm<FormValues>({
    resolver: zodResolver(predictionSchema) as never,
    mode: 'onChange',
    defaultValues: {},
  });
  const { watch, setValue, handleSubmit } = methods;

  const values = watch();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cascading: clear downstream picks when semifinal winners change in a
  // way that invalidates them.
  const sf1Winner = values.sf1_winner;
  const sf2Winner = values.sf2_winner;
  const gfWinner = values.gf_winner;
  const thirdWinner = values.third_winner;

  useEffect(() => {
    if (
      gfWinner &&
      gfWinner !== sf1Winner &&
      gfWinner !== sf2Winner
    ) {
      setValue('gf_winner', undefined as never, { shouldValidate: true });
    }
    const sf1Loser = getSf1Loser(sf1Winner);
    const sf2Loser = getSf2Loser(sf2Winner);
    if (
      thirdWinner &&
      thirdWinner !== sf1Loser &&
      thirdWinner !== sf2Loser
    ) {
      setValue('third_winner', undefined as never, { shouldValidate: true });
    }
  }, [sf1Winner, sf2Winner, gfWinner, thirdWinner, setValue]);

  const deadlinePassed = isDeadlinePassed();
  const parseResult = predictionSchema.safeParse(values);
  const allFilled = parseResult.success;

  async function submit(data: PredictionSubmission) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'Failed to submit prediction');
        return;
      }
      toast.success('Prediction locked in!');
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormProvider {...methods}>
      <Card>
        <CardHeader>
          <CardTitle>Make your playoff prediction</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick the winner of every series and the score (BO7). Grand Final and
            Third Place options unlock once you pick both semifinals.
            Predictions close {formatDeadline()}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {deadlinePassed && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Predictions are closed. Submissions are no longer accepted.
            </div>
          )}

          <form
            onSubmit={handleSubmit(() => {
              if (allFilled) setConfirmOpen(true);
            })}
            className="space-y-4"
          >
            <PredictionBracket mode="form" />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="submit"
                disabled={!allFilled || deadlinePassed || submitting}
              >
                {deadlinePassed ? 'Predictions closed' : 'Review & submit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {allFilled && (
        <PredictionConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          values={parseResult.data}
          submitting={submitting}
          onConfirm={() => submit(parseResult.data)}
        />
      )}
    </FormProvider>
  );
}
