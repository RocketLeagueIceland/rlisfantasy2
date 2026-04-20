'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PredictionBracket } from './PredictionBracket';
import { PredictionConfirmDialog } from './PredictionConfirmDialog';
import {
  bracketFormSchema,
  previewPrediction,
  toPredictionSubmission,
  type BracketFormValues,
} from '@/lib/predictions/bracket-form';
import { formatDeadline, isDeadlinePassed } from '@/lib/predictions/helpers';

type FormValues = Partial<BracketFormValues>;

export function PredictionForm() {
  const router = useRouter();
  const methods = useForm<FormValues>({
    resolver: zodResolver(bracketFormSchema) as never,
    mode: 'onChange',
    defaultValues: {},
  });
  const { watch, handleSubmit } = methods;

  const values = watch();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const deadlinePassed = isDeadlinePassed();
  const parseResult = bracketFormSchema.safeParse(values);
  const allFilled = parseResult.success;

  async function submit(data: BracketFormValues) {
    setSubmitting(true);
    try {
      const submission = toPredictionSubmission(data);
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(submission),
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
            For each series, type the number of games each team wins. The team
            that reaches 4 wins the series and advances. Predictions close{' '}
            {formatDeadline()}.
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
          preview={previewPrediction(parseResult.data)}
          submitting={submitting}
          onConfirm={() => submit(parseResult.data)}
        />
      )}
    </FormProvider>
  );
}
