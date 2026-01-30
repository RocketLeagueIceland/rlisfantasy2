import type { RLPlayer } from '@/types';
import type { ParsedPlayerStats } from './client';

/**
 * Matches ballchasing player stats to registered RL players using name and aliases.
 * Players can use different names in different games, so we need to check:
 * 1. Exact match on player name
 * 2. Exact match on any alias
 * 3. Case-insensitive match on name or aliases
 */
export function matchPlayerStats(
  parsedStats: Map<string, ParsedPlayerStats>,
  registeredPlayers: RLPlayer[]
): Map<string, { player: RLPlayer; stats: ParsedPlayerStats }> {
  const matchedStats = new Map<string, { player: RLPlayer; stats: ParsedPlayerStats }>();
  const unmatchedStats: ParsedPlayerStats[] = [];

  // Create lookup maps for faster matching
  const nameToPlayer = new Map<string, RLPlayer>();
  const aliasToPlayer = new Map<string, RLPlayer>();

  for (const player of registeredPlayers) {
    // Add exact name
    nameToPlayer.set(player.name.toLowerCase(), player);

    // Add all aliases
    if (player.aliases) {
      for (const alias of player.aliases) {
        aliasToPlayer.set(alias.toLowerCase(), player);
      }
    }
  }

  // Try to match each parsed player stat
  for (const [ballchasingId, stats] of parsedStats) {
    const playerName = stats.name.toLowerCase();

    // Try exact match on name
    let matchedPlayer = nameToPlayer.get(playerName);

    // Try exact match on alias
    if (!matchedPlayer) {
      matchedPlayer = aliasToPlayer.get(playerName);
    }

    // Try partial match (in case of slight name variations)
    if (!matchedPlayer) {
      for (const player of registeredPlayers) {
        // Check if the player name contains or is contained by the ballchasing name
        if (
          player.name.toLowerCase().includes(playerName) ||
          playerName.includes(player.name.toLowerCase())
        ) {
          matchedPlayer = player;
          break;
        }

        // Check aliases for partial match
        if (player.aliases) {
          for (const alias of player.aliases) {
            if (
              alias.toLowerCase().includes(playerName) ||
              playerName.includes(alias.toLowerCase())
            ) {
              matchedPlayer = player;
              break;
            }
          }
        }

        if (matchedPlayer) break;
      }
    }

    if (matchedPlayer) {
      // Check if we already have stats for this player (from different ballchasing IDs)
      const existing = matchedStats.get(matchedPlayer.id);
      if (existing) {
        // Merge stats if player appeared with different names
        existing.stats.gamesPlayed += stats.gamesPlayed;
        existing.stats.perGameStats.push(...stats.perGameStats.map((g, i) => ({
          ...g,
          gameNumber: existing.stats.gamesPlayed - stats.gamesPlayed + i + 1,
        })));
        existing.stats.totals.goals += stats.totals.goals;
        existing.stats.totals.assists += stats.totals.assists;
        existing.stats.totals.saves += stats.totals.saves;
        existing.stats.totals.shots += stats.totals.shots;
        existing.stats.totals.demosReceived += stats.totals.demosReceived;
      } else {
        matchedStats.set(matchedPlayer.id, { player: matchedPlayer, stats });
      }
    } else {
      unmatchedStats.push(stats);
    }
  }

  // Log unmatched players for debugging
  if (unmatchedStats.length > 0) {
    console.warn(
      '[PlayerMatcher] Unmatched players from ballchasing:',
      unmatchedStats.map((s) => s.name)
    );
  }

  return matchedStats;
}

/**
 * Get a list of player names from ballchasing that couldn't be matched.
 * Useful for admin to know which aliases need to be added.
 */
export function getUnmatchedPlayerNames(
  parsedStats: Map<string, ParsedPlayerStats>,
  registeredPlayers: RLPlayer[]
): string[] {
  const unmatched: string[] = [];

  const allNames = new Set<string>();
  for (const player of registeredPlayers) {
    allNames.add(player.name.toLowerCase());
    if (player.aliases) {
      for (const alias of player.aliases) {
        allNames.add(alias.toLowerCase());
      }
    }
  }

  for (const [, stats] of parsedStats) {
    const playerName = stats.name.toLowerCase();
    if (!allNames.has(playerName)) {
      // Check for partial matches
      let found = false;
      for (const name of allNames) {
        if (name.includes(playerName) || playerName.includes(name)) {
          found = true;
          break;
        }
      }
      if (!found) {
        unmatched.push(stats.name);
      }
    }
  }

  return [...new Set(unmatched)]; // Remove duplicates
}
