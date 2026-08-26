import { PlayersTable } from '@/components/players/PlayersTable';

export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="text-muted-foreground">
          All available Rocket League players with their season stats
        </p>
      </div>

      <PlayersTable />
    </div>
  );
}
