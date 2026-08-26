'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PredictionBracket } from '@/components/predictions/PredictionBracket';
import { PredictionForm } from '@/components/predictions/PredictionForm';
import { PredictionsList } from '@/components/predictions/PredictionsList';
import { formatDeadline, isDeadlinePassed } from '@/lib/predictions/helpers';
import type {
  PlayoffPrediction,
  PlayoffPredictionWithUser,
} from '@/types/predictions';

interface Props {
  ownPrediction: PlayoffPrediction | null;
  otherPredictions: PlayoffPredictionWithUser[];
  currentUsername: string;
  bracketAvailable: boolean;
  seasonName: string | null;
}

export function PredictionsPageClient({
  ownPrediction,
  otherPredictions,
  currentUsername,
  bracketAvailable,
  seasonName,
}: Props) {
  const deadlinePassed = isDeadlinePassed();

  if (!bracketAvailable) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Playoff Predictions</h1>
          <p className="text-muted-foreground">
            Predict the RLIS playoff bracket. One shot — picks are final.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Predictions aren&apos;t open yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The {seasonName ?? 'current season'} playoff bracket is decided by league play, so
              predictions open once the semifinal matchups are known. Check back at the end of the
              regular season!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Playoff Predictions</h1>
        <p className="text-muted-foreground">
          Predict the RLIS playoff bracket. One shot — picks are final.
        </p>
      </div>

      {ownPrediction ? (
        <Card>
          <CardHeader>
            <CardTitle>Your prediction</CardTitle>
            <p className="text-sm text-muted-foreground">
              {currentUsername} · Submitted{' '}
              {new Date(ownPrediction.created_at).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </CardHeader>
          <CardContent>
            <PredictionBracket
              mode="view"
              prediction={ownPrediction}
              highlight
            />
          </CardContent>
        </Card>
      ) : deadlinePassed ? (
        <Card>
          <CardHeader>
            <CardTitle>Predictions closed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The deadline was {formatDeadline()}. Predictions can no longer be
              submitted.
            </p>
          </CardContent>
        </Card>
      ) : (
        <PredictionForm />
      )}

      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Other predictions ({otherPredictions.length})
        </h2>
        <PredictionsList predictions={otherPredictions} />
      </div>
    </div>
  );
}
