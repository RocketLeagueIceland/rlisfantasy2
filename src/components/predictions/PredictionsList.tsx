import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { isSafeUrl } from '@/lib/utils';
import { PredictionBracket } from './PredictionBracket';
import type { PlayoffPredictionWithUser } from '@/types/predictions';

export function PredictionsList({
  predictions,
}: {
  predictions: PlayoffPredictionWithUser[];
}) {
  if (predictions.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No other predictions yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {predictions.map((p) => (
        <Card key={p.id}>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Avatar>
              <AvatarImage
                src={isSafeUrl(p.user.avatar_url)}
                alt={p.user.username}
              />
              <AvatarFallback>
                {p.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{p.user.username}</p>
              <p className="text-xs text-muted-foreground">
                Submitted{' '}
                {new Date(p.created_at).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <PredictionBracket mode="view" prediction={p} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
