import type { Role, PointsBreakdown, PlayerStats, FantasyTeamPlayer } from '@/types';
import { BASE_POINTS, ROLE_MULTIPLIERS } from './constants';

interface TotalStats {
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  demos_received: number;
}

/**
 * Calculate points from total stats with role bonuses
 * Returns the total points (not averaged)
 */
export function calculateTotalPoints(stats: TotalStats, role: Role): number {
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
 * Calculate base points (without role bonus) from total stats
 */
export function calculateBasePoints(stats: TotalStats): number {
  return (
    stats.goals * BASE_POINTS.goal +
    stats.assists * BASE_POINTS.assist +
    stats.saves * BASE_POINTS.save +
    stats.shots * BASE_POINTS.shot +
    stats.demos_received * BASE_POINTS.demo_received
  );
}

/**
 * Extract total stats from PlayerStats
 */
function getTotalStatsFromPlayerStats(playerStats: PlayerStats): TotalStats {
  return {
    goals: playerStats.total_goals,
    assists: playerStats.total_assists,
    saves: playerStats.total_saves,
    shots: playerStats.total_shots,
    demos_received: playerStats.total_demos_received,
  };
}

/**
 * Calculate total points for a fantasy team for a given week
 *
 * Scoring rules:
 * - Each active role (striker, midfield, goalkeeper) gets their role's 2x bonus
 * - If active player has ≥1 game, use their stats (no substitution)
 * - If active player has 0 games, substitute with Sub 1, then Sub 2, then Sub 3
 * - Substitutes inherit the active player's role bonus
 * - Final score is total points / games played (average per game)
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
    .sort((a, b) => (a.sub_order || 0) - (b.sub_order || 0));

  // Track which substitutes have been used (each sub can only fill in once)
  const usedSubIds = new Set<string>();

  for (const activePlayer of activePlayers) {
    const role = activePlayer.role!;
    const activeStats = playerStats.get(activePlayer.rl_player_id);
    const activeGamesPlayed = activeStats?.games_played || 0;

    let usedStats: TotalStats | null = null;
    let gamesPlayed = 0;
    let substitutionDetails: { sub_player_id: string; sub_player_name: string; games_filled: number; points_earned: number }[] | undefined;

    if (activeGamesPlayed > 0) {
      // Active player played - use their stats
      usedStats = getTotalStatsFromPlayerStats(activeStats!);
      gamesPlayed = activeGamesPlayed;
    } else {
      // Active player didn't play - try substitutes in order
      for (const sub of substitutes) {
        if (usedSubIds.has(sub.rl_player_id)) continue;

        const subStats = playerStats.get(sub.rl_player_id);
        const subGamesPlayed = subStats?.games_played || 0;

        if (subGamesPlayed > 0) {
          // Found a substitute who played
          usedSubIds.add(sub.rl_player_id);
          usedStats = getTotalStatsFromPlayerStats(subStats!);
          gamesPlayed = subGamesPlayed;
          substitutionDetails = [{
            sub_player_id: sub.rl_player_id,
            sub_player_name: sub.rl_player?.name || 'Unknown',
            games_filled: subGamesPlayed,
            points_earned: 0, // Will be calculated below
          }];
          break;
        }
      }
    }

    // Calculate points
    let totalPoints = 0;
    let basePoints = 0;
    let averagePoints = 0;
    let finalStats: TotalStats = { goals: 0, assists: 0, saves: 0, shots: 0, demos_received: 0 };

    if (usedStats && gamesPlayed > 0) {
      totalPoints = calculateTotalPoints(usedStats, role);
      basePoints = calculateBasePoints(usedStats);
      averagePoints = totalPoints / gamesPlayed;
      finalStats = usedStats;

      // Update sub's points_earned if there was a substitution
      if (substitutionDetails && substitutionDetails.length > 0) {
        substitutionDetails[0].points_earned = Math.round(averagePoints);
      }
    }

    breakdown.push({
      player_id: activePlayer.rl_player_id,
      player_name: activePlayer.rl_player?.name || 'Unknown',
      role,
      games_used: gamesPlayed,
      base_points: basePoints,
      role_bonus: totalPoints - basePoints,
      total_points: Math.round(averagePoints), // Average across games, rounded
      stats: finalStats,
      substitutions: substitutionDetails,
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
