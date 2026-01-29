const BALLCHASING_API_URL = 'https://ballchasing.com/api';

interface BallchasingReplay {
  id: string;
  title: string;
  blue: {
    players: BallchasingPlayer[];
  };
  orange: {
    players: BallchasingPlayer[];
  };
}

interface BallchasingPlayer {
  id: {
    platform: string;
    id: string;
  };
  name: string;
  stats: {
    core: {
      goals: number;
      assists: number;
      saves: number;
      shots: number;
    };
    demo: {
      inflicted: number;
      taken: number;
    };
  };
}

interface BallchasingGroup {
  id: string;
  name: string;
  children?: BallchasingGroup[];
}

export async function getGroupReplays(groupId: string): Promise<BallchasingReplay[]> {
  const apiKey = process.env.BALLCHASING_API_KEY;
  if (!apiKey) {
    throw new Error('BALLCHASING_API_KEY is not set');
  }

  const response = await fetch(
    `${BALLCHASING_API_URL}/replays?group=${groupId}&count=200`,
    {
      headers: {
        Authorization: apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Ballchasing API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.list || [];
}

export async function getReplayDetails(replayId: string): Promise<BallchasingReplay> {
  const apiKey = process.env.BALLCHASING_API_KEY;
  if (!apiKey) {
    throw new Error('BALLCHASING_API_KEY is not set');
  }

  const response = await fetch(`${BALLCHASING_API_URL}/replays/${replayId}`, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Ballchasing API error: ${response.statusText}`);
  }

  return response.json();
}

export interface ParsedPlayerStats {
  ballchasingId: string;
  name: string;
  gamesPlayed: number;
  perGameStats: {
    gameNumber: number;
    goals: number;
    assists: number;
    saves: number;
    shots: number;
    demosReceived: number;
  }[];
  totals: {
    goals: number;
    assists: number;
    saves: number;
    shots: number;
    demosReceived: number;
  };
}

export async function parseGroupStats(groupId: string): Promise<Map<string, ParsedPlayerStats>> {
  const replays = await getGroupReplays(groupId);
  const playerStats = new Map<string, ParsedPlayerStats>();

  // Fetch details for each replay
  for (let i = 0; i < replays.length; i++) {
    const replay = replays[i];
    const details = await getReplayDetails(replay.id);

    const allPlayers = [...details.blue.players, ...details.orange.players];

    for (const player of allPlayers) {
      const playerId = `${player.id.platform}:${player.id.id}`;
      const existing = playerStats.get(playerId) || {
        ballchasingId: playerId,
        name: player.name,
        gamesPlayed: 0,
        perGameStats: [],
        totals: {
          goals: 0,
          assists: 0,
          saves: 0,
          shots: 0,
          demosReceived: 0,
        },
      };

      existing.gamesPlayed += 1;
      existing.perGameStats.push({
        gameNumber: existing.gamesPlayed,
        goals: player.stats.core.goals,
        assists: player.stats.core.assists,
        saves: player.stats.core.saves,
        shots: player.stats.core.shots,
        demosReceived: player.stats.demo.taken,
      });
      existing.totals.goals += player.stats.core.goals;
      existing.totals.assists += player.stats.core.assists;
      existing.totals.saves += player.stats.core.saves;
      existing.totals.shots += player.stats.core.shots;
      existing.totals.demosReceived += player.stats.demo.taken;

      playerStats.set(playerId, existing);
    }
  }

  return playerStats;
}
