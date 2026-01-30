import { RLPlayer, RLTeam, SlotType, FantasyTeamPlayer } from '@/types';

// Max players from the same RL team allowed on a fantasy team
export const MAX_PLAYERS_PER_RL_TEAM = 2;

// Max active players from the same RL team allowed
export const MAX_ACTIVE_PER_RL_TEAM = 1;

interface TeamPlayer {
  rl_player?: RLPlayer;
  slot_type: SlotType;
  rl_player_id?: string;
}

/**
 * Count how many players from a specific RL team are on the fantasy team
 */
export function countPlayersFromTeam(
  teamPlayers: TeamPlayer[],
  rlTeam: RLTeam
): number {
  return teamPlayers.filter((tp) => tp.rl_player?.team === rlTeam).length;
}

/**
 * Count how many active players from a specific RL team are on the fantasy team
 */
export function countActivePlayersFromTeam(
  teamPlayers: TeamPlayer[],
  rlTeam: RLTeam
): number {
  return teamPlayers.filter(
    (tp) => tp.rl_player?.team === rlTeam && tp.slot_type === 'active'
  ).length;
}

interface CanAddPlayerResult {
  valid: boolean;
  reason?: string;
}

/**
 * Check if a player can be added to the fantasy team given constraints
 * @param teamPlayers Current players on the fantasy team
 * @param newPlayer The player attempting to add
 * @param slotType Whether the new player would be active or substitute
 * @param replacingPlayerId Optional - if replacing a player, their ID (they won't count toward limits)
 */
export function canAddPlayer(
  teamPlayers: TeamPlayer[],
  newPlayer: RLPlayer,
  slotType: SlotType,
  replacingPlayerId?: string
): CanAddPlayerResult {
  // Filter out the player being replaced (if any)
  const currentPlayers = replacingPlayerId
    ? teamPlayers.filter(
        (tp) => tp.rl_player_id !== replacingPlayerId && tp.rl_player?.id !== replacingPlayerId
      )
    : teamPlayers;

  const rlTeam = newPlayer.team;
  const currentFromTeam = countPlayersFromTeam(currentPlayers, rlTeam);
  const currentActiveFromTeam = countActivePlayersFromTeam(currentPlayers, rlTeam);

  // Check max 2 players per RL team
  if (currentFromTeam >= MAX_PLAYERS_PER_RL_TEAM) {
    return {
      valid: false,
      reason: `You already have ${MAX_PLAYERS_PER_RL_TEAM} players from ${formatTeamName(rlTeam)}. Maximum ${MAX_PLAYERS_PER_RL_TEAM} allowed per RL team.`,
    };
  }

  // Check max 1 active per RL team
  if (slotType === 'active' && currentActiveFromTeam >= MAX_ACTIVE_PER_RL_TEAM) {
    return {
      valid: false,
      reason: `You already have an active player from ${formatTeamName(rlTeam)}. Only ${MAX_ACTIVE_PER_RL_TEAM} active player per RL team allowed.`,
    };
  }

  return { valid: true };
}

/**
 * Validate an entire team composition against constraints
 */
export function validateTeamConstraints(
  teamPlayers: TeamPlayer[]
): CanAddPlayerResult {
  // Group players by RL team
  const teamCounts = new Map<RLTeam, { total: number; active: number }>();

  for (const tp of teamPlayers) {
    if (!tp.rl_player) continue;

    const rlTeam = tp.rl_player.team;
    const current = teamCounts.get(rlTeam) || { total: 0, active: 0 };
    current.total++;
    if (tp.slot_type === 'active') {
      current.active++;
    }
    teamCounts.set(rlTeam, current);
  }

  // Check constraints for each team
  for (const [rlTeam, counts] of teamCounts) {
    if (counts.total > MAX_PLAYERS_PER_RL_TEAM) {
      return {
        valid: false,
        reason: `Too many players from ${formatTeamName(rlTeam)}: ${counts.total} (max ${MAX_PLAYERS_PER_RL_TEAM})`,
      };
    }
    if (counts.active > MAX_ACTIVE_PER_RL_TEAM) {
      return {
        valid: false,
        reason: `Too many active players from ${formatTeamName(rlTeam)}: ${counts.active} (max ${MAX_ACTIVE_PER_RL_TEAM})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Format team name for display
 */
function formatTeamName(team: RLTeam): string {
  const names: Record<RLTeam, string> = {
    '354esports': '354 Esports',
    dusty: 'Dusty',
    hamar: 'Hamar',
    omon: 'Omon',
    thor: 'Thor',
    stjarnan: 'Stjarnan',
  };
  return names[team] || team;
}

/**
 * Check if swapping two players would violate team constraints
 * @param teamPlayers Current players on the fantasy team
 * @param player1Id First player ID (being dragged)
 * @param player2Id Second player ID (drop target)
 */
export function canSwapPlayers(
  teamPlayers: TeamPlayer[],
  player1Id: string,
  player2Id: string
): CanAddPlayerResult {
  const player1 = teamPlayers.find(
    (tp) => tp.rl_player_id === player1Id || tp.rl_player?.id === player1Id
  );
  const player2 = teamPlayers.find(
    (tp) => tp.rl_player_id === player2Id || tp.rl_player?.id === player2Id
  );

  if (!player1 || !player2) {
    return { valid: false, reason: 'Players not found' };
  }

  // Same slot type swaps are always valid (active↔active or sub↔sub)
  if (player1.slot_type === player2.slot_type) {
    return { valid: true };
  }

  // Active ↔ Substitute swap - need to validate constraints
  // Simulate the swap: player1 gets player2's slot_type and vice versa
  const simulatedTeam = teamPlayers.map((tp) => {
    const id = tp.rl_player_id || tp.rl_player?.id;
    if (id === player1Id) {
      return { ...tp, slot_type: player2.slot_type };
    }
    if (id === player2Id) {
      return { ...tp, slot_type: player1.slot_type };
    }
    return tp;
  });

  return validateTeamConstraints(simulatedTeam);
}

/**
 * Check if moving a player to an empty slot would violate team constraints
 * @param teamPlayers Current players on the fantasy team
 * @param playerId Player ID being moved
 * @param targetSlotType The target slot type (active or substitute)
 */
export function canMoveToEmptySlot(
  teamPlayers: TeamPlayer[],
  playerId: string,
  targetSlotType: SlotType
): CanAddPlayerResult {
  const player = teamPlayers.find(
    (tp) => tp.rl_player_id === playerId || tp.rl_player?.id === playerId
  );

  if (!player) {
    return { valid: false, reason: 'Player not found' };
  }

  // Same slot type moves are always valid (just changing role or sub_order)
  if (player.slot_type === targetSlotType) {
    return { valid: true };
  }

  // Moving between slot types - simulate and validate
  const simulatedTeam = teamPlayers.map((tp) => {
    const id = tp.rl_player_id || tp.rl_player?.id;
    if (id === playerId) {
      return { ...tp, slot_type: targetSlotType };
    }
    return tp;
  });

  return validateTeamConstraints(simulatedTeam);
}
