import type { Role, PerGameStats, PointsBreakdown, PlayerStats, FantasyTeamPlayer } from '@/types';
import { BASE_POINTS, ROLE_MULTIPLIERS, GAMES_IN_SERIES } from './constants';

interface GameScore {
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  demos_received: number;
}

/**
 * Calculate points for a single game with role bonuses
 */
export function calculateGamePoints(stats: GameScore, role: Role): number {
  const multipliers = ROLE_MULTIPLIERS[role];

  return (
    stats.goals * BASE_POINTS.goal * multipliers.goal +
    stats.assists * BASE_POINTS.assist * multipliers.assist +
    stats.saves * BASE_POINTS.save * multipliers.save +
    stats.shots * BASE_POINTS.shot * multipliers.shot +
    stats.demos_received * BASE_POINTS.demo_received * multipliers.demo_received
  );
}

/**
 * Calculate average points across games played
 */
export function calculateAveragePoints(
  perGameStats: PerGameStats[],
  role: Role
): { totalPoints: number; averagePoints: number } {
  if (perGameStats.length === 0) {
    return { totalPoints: 0, averagePoints: 0 };
  }

  const totalPoints = perGameStats.reduce((sum, game) => {
    return sum + calculateGamePoints({
      goals: game.goals,
      assists: game.assists,
      saves: game.saves,
      shots: game.shots,
      demos_received: game.demos_received,
    }, role);
  }, 0);

  return {
    totalPoints,
    averagePoints: totalPoints / perGameStats.length,
  };
}

/**
 * Apply substitution logic when active player misses games
 * Returns the games to use for scoring, potentially from substitutes
 */
export function applySubstitutions(
  activePlayer: {
    playerId: string;
    playerName: string;
    role: Role;
    stats: PlayerStats | null;
  },
  substitutes: {
    playerId: string;
    playerName: string;
    subOrder: number;
    stats: PlayerStats | null;
  }[]
): {
  gamesUsed: PerGameStats[];
  substitutionDetails: {
    subPlayerId: string;
    subPlayerName: string;
    gamesFilled: number;
  }[];
} {
  const result: PerGameStats[] = [];
  const substitutionDetails: {
    subPlayerId: string;
    subPlayerName: string;
    gamesFilled: number;
  }[] = [];

  // Get active player's games
  const activeGames = activePlayer.stats?.per_game_stats || [];
  const gamesNeeded = GAMES_IN_SERIES;

  // Add active player's games first
  result.push(...activeGames);

  // If active player played all games, no substitution needed
  if (activeGames.length >= gamesNeeded) {
    return { gamesUsed: result.slice(0, gamesNeeded), substitutionDetails };
  }

  // Sort substitutes by sub_order
  const sortedSubs = [...substitutes].sort((a, b) => a.subOrder - b.subOrder);

  // Fill remaining games with substitutes
  let gamesRemaining = gamesNeeded - result.length;

  for (const sub of sortedSubs) {
    if (gamesRemaining <= 0) break;

    const subGames = sub.stats?.per_game_stats || [];
    const gamesToUse = subGames.slice(0, gamesRemaining);

    if (gamesToUse.length > 0) {
      result.push(...gamesToUse);
      substitutionDetails.push({
        subPlayerId: sub.playerId,
        subPlayerName: sub.playerName,
        gamesFilled: gamesToUse.length,
      });
      gamesRemaining -= gamesToUse.length;
    }
  }

  return { gamesUsed: result, substitutionDetails };
}

/**
 * Calculate total points for a fantasy team for a given week
 */
export function calculateTeamScore(
  teamPlayers: FantasyTeamPlayer[],
  playerStats: Map<string, PlayerStats>
): PointsBreakdown[] {
  const breakdown: PointsBreakdown[] = [];

  // Get active players and substitutes
  const activePlayers = teamPlayers
    .filter(p => p.slot_type === 'active')
    .sort((a, b) => {
      const roleOrder = { striker: 0, midfield: 1, goalkeeper: 2 };
      return roleOrder[a.role!] - roleOrder[b.role!];
    });

  const substitutes = teamPlayers
    .filter(p => p.slot_type === 'substitute')
    .map(p => ({
      playerId: p.rl_player_id,
      playerName: p.rl_player?.name || 'Unknown',
      subOrder: p.sub_order!,
      stats: playerStats.get(p.rl_player_id) || null,
    }));

  // Track which substitute games have been used
  const usedSubGames = new Map<string, number>();

  for (const activePlayer of activePlayers) {
    const role = activePlayer.role!;
    const stats = playerStats.get(activePlayer.rl_player_id) || null;

    // Apply substitution logic
    const { gamesUsed, substitutionDetails } = applySubstitutions(
      {
        playerId: activePlayer.rl_player_id,
        playerName: activePlayer.rl_player?.name || 'Unknown',
        role,
        stats,
      },
      substitutes.map(sub => ({
        ...sub,
        stats: sub.stats ? {
          ...sub.stats,
          per_game_stats: sub.stats.per_game_stats.slice(
            usedSubGames.get(sub.playerId) || 0
          ),
        } : null,
      }))
    );

    // Update used games for substitutes
    for (const subDetail of substitutionDetails) {
      const currentUsed = usedSubGames.get(subDetail.subPlayerId) || 0;
      usedSubGames.set(subDetail.subPlayerId, currentUsed + subDetail.gamesFilled);
    }

    // Calculate points with role bonus
    const { totalPoints, averagePoints } = calculateAveragePoints(gamesUsed, role);

    // Calculate base points (without role bonus) for comparison
    const basePoints = gamesUsed.reduce((sum, game) => {
      return sum + (
        game.goals * BASE_POINTS.goal +
        game.assists * BASE_POINTS.assist +
        game.saves * BASE_POINTS.save +
        game.shots * BASE_POINTS.shot +
        game.demos_received * BASE_POINTS.demo_received
      );
    }, 0);

    // Sum up total stats
    const totalStats = gamesUsed.reduce(
      (acc, game) => ({
        goals: acc.goals + game.goals,
        assists: acc.assists + game.assists,
        saves: acc.saves + game.saves,
        shots: acc.shots + game.shots,
        demos_received: acc.demos_received + game.demos_received,
      }),
      { goals: 0, assists: 0, saves: 0, shots: 0, demos_received: 0 }
    );

    breakdown.push({
      player_id: activePlayer.rl_player_id,
      player_name: activePlayer.rl_player?.name || 'Unknown',
      role,
      games_used: gamesUsed.length,
      base_points: basePoints,
      role_bonus: totalPoints - basePoints,
      total_points: Math.round(averagePoints), // Average across games
      stats: totalStats,
      substitutions: substitutionDetails.length > 0
        ? substitutionDetails.map(s => ({
            sub_player_id: s.subPlayerId,
            sub_player_name: s.subPlayerName,
            games_filled: s.gamesFilled,
            points_earned: 0, // Calculated separately if needed
          }))
        : undefined,
    });
  }

  return breakdown;
}

/**
 * Calculate total team points from breakdown
 */
export function getTotalPoints(breakdown: PointsBreakdown[]): number {
  return breakdown.reduce((sum, player) => sum + player.total_points, 0);
}
