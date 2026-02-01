const BALLCHASING_API_URL = 'https://ballchasing.com/api';

// Player stats as returned in the group's players array
interface BallchasingGroupPlayer {
  platform: string;
  id: string;
  name: string;
  team?: string;
  cumulative: {
    games: number;
    wins: number;
    core: {
      shots: number;
      goals: number;
      saves: number;
      assists: number;
      score: number;
    };
    demo: {
      inflicted: number;
      taken: number;
    };
  };
}

interface BallchasingGroupResponse {
  id: string;
  name: string;
  players?: BallchasingGroupPlayer[];
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

async function getGroupWithPlayers(groupId: string): Promise<BallchasingGroupResponse> {
  const apiKey = process.env.BALLCHASING_API_KEY;
  if (!apiKey) {
    throw new Error('BALLCHASING_API_KEY is not set');
  }

  const response = await fetch(`${BALLCHASING_API_URL}/groups/${groupId}`, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Ballchasing API error: ${response.statusText}`);
  }

  return response.json();
}

export async function parseGroupStats(groupId: string): Promise<Map<string, ParsedPlayerStats>> {
  console.log(`[Ballchasing] Fetching group stats for: ${groupId}`);

  const group = await getGroupWithPlayers(groupId);
  const playerStats = new Map<string, ParsedPlayerStats>();

  if (!group.players || group.players.length === 0) {
    console.log(`[Ballchasing] No players found in group "${group.name}"`);
    return playerStats;
  }

  console.log(`[Ballchasing] Found ${group.players.length} players in group "${group.name}"`);

  // Use the pre-aggregated player stats from the group
  for (const player of group.players) {
    const playerId = `${player.platform}:${player.id}`;
    const gamesPlayed = player.cumulative.games;

    // Generate per-game stats (distribute totals evenly since we don't have per-game data)
    const perGameStats = [];
    for (let i = 1; i <= gamesPlayed; i++) {
      perGameStats.push({
        gameNumber: i,
        goals: Math.floor(player.cumulative.core.goals / gamesPlayed),
        assists: Math.floor(player.cumulative.core.assists / gamesPlayed),
        saves: Math.floor(player.cumulative.core.saves / gamesPlayed),
        shots: Math.floor(player.cumulative.core.shots / gamesPlayed),
        demosReceived: Math.floor(player.cumulative.demo.taken / gamesPlayed),
      });
    }

    playerStats.set(playerId, {
      ballchasingId: playerId,
      name: player.name,
      gamesPlayed,
      perGameStats,
      totals: {
        goals: player.cumulative.core.goals,
        assists: player.cumulative.core.assists,
        saves: player.cumulative.core.saves,
        shots: player.cumulative.core.shots,
        demosReceived: player.cumulative.demo.taken,
      },
    });

    console.log(`[Ballchasing] Player "${player.name}": ${gamesPlayed} games, ${player.cumulative.core.goals} goals`);
  }

  return playerStats;
}
