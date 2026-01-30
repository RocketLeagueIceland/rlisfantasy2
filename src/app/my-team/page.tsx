'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Save, Edit2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FieldVisualization,
  BudgetDisplay,
  PlayerPicker,
  TransferModal,
} from '@/components/fantasy';
import { canSwapPlayers } from '@/lib/fantasy/constraints';
import type { RLPlayer, Role, FantasyTeam, FantasyTeamPlayer, Week } from '@/types';
import { INITIAL_BUDGET } from '@/lib/scoring/constants';

interface PickerState {
  open: boolean;
  slotType: 'active' | 'substitute';
  role?: Role;
  subOrder?: number;
}

export default function MyTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<FantasyTeamPlayer[]>([]);
  const [allPlayers, setAllPlayers] = useState<RLPlayer[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [teamName, setTeamName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [pickerState, setPickerState] = useState<PickerState>({
    open: false,
    slotType: 'active',
  });
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  // Calculate current budget
  const calculateBudget = () => {
    if (team) {
      return team.budget_remaining;
    }
    const spent = teamPlayers.reduce((sum, p) => sum + p.purchase_price, 0);
    return INITIAL_BUDGET - spent;
  };

  useEffect(() => {
    const supabase = createClient();

    // Use onAuthStateChange to detect auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[MyTeam] Auth state:', event, session?.user?.id);

        if (event === 'SIGNED_OUT') {
          router.push('/login?redirect=/my-team');
          return;
        }

        if ((event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && !session?.user) {
          console.log('[MyTeam] No session, redirecting to login');
          router.push('/login?redirect=/my-team');
          return;
        }

        if (session?.user) {
          setUser({ id: session.user.id });
          await fetchData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    try {
      console.log('[MyTeam] Fetching data via API...');

      // Fetch all data in parallel via API routes
      const [playersRes, weekRes, teamRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/weeks/current'),
        fetch('/api/fantasy-teams'),
      ]);

      const playersData = await playersRes.json();
      const weekData = await weekRes.json();
      const teamData = await teamRes.json();

      console.log('[MyTeam] Players:', playersData.players?.length);
      console.log('[MyTeam] Week:', weekData.week);
      console.log('[MyTeam] Team:', teamData.team);

      setAllPlayers(playersData.players || []);
      setCurrentWeek(weekData.week);

      if (teamData.team) {
        setTeam(teamData.team);
        setTeamName(teamData.team.name);
        setTeamPlayers(teamData.teamPlayers || []);
      }

      setLoading(false);
    } catch (e) {
      console.error('[MyTeam] Error fetching data:', e);
      setLoading(false);
    }
  };

  const handleSlotClick = (slotType: 'active' | 'substitute', role?: Role, subOrder?: number) => {
    // Check if slot already has a player
    const existingPlayer = teamPlayers.find((p) => {
      if (slotType === 'active') {
        return p.slot_type === 'active' && p.role === role;
      }
      return p.slot_type === 'substitute' && p.sub_order === subOrder;
    });

    if (existingPlayer && team) {
      // Player exists and team is saved - can only transfer
      toast.info('Use the Transfer button to change this player');
      return;
    }

    // Open picker for empty slot or during team creation
    setPickerState({ open: true, slotType, role, subOrder });
  };

  const handleSelectPlayer = async (player: RLPlayer) => {
    const newTeamPlayer: FantasyTeamPlayer = {
      id: `temp-${Date.now()}`,
      fantasy_team_id: team?.id || '',
      rl_player_id: player.id,
      slot_type: pickerState.slotType,
      role: pickerState.role || null,
      sub_order: pickerState.subOrder || null,
      purchase_price: player.price,
      created_at: new Date().toISOString(),
      rl_player: player,
    };

    // Remove any existing player in the same slot before adding the new one
    const filteredPlayers = teamPlayers.filter((p) => {
      if (pickerState.slotType === 'active') {
        // Remove player with same role
        return !(p.slot_type === 'active' && p.role === pickerState.role);
      }
      // Remove player with same sub_order
      return !(p.slot_type === 'substitute' && p.sub_order === pickerState.subOrder);
    });

    setTeamPlayers([...filteredPlayers, newTeamPlayer]);
    setPickerState({ ...pickerState, open: false });
  };

  const handleRemovePlayer = (slotType: 'active' | 'substitute', role?: Role, subOrder?: number) => {
    // Only allow removal during team creation
    if (team) return;

    setTeamPlayers(teamPlayers.filter((p) => {
      if (slotType === 'active') {
        return !(p.slot_type === 'active' && p.role === role);
      }
      return !(p.slot_type === 'substitute' && p.sub_order === subOrder);
    }));
  };

  const handleSaveClick = () => {
    if (!user) return;

    if (teamPlayers.length !== 6) {
      toast.error('You must select exactly 6 players');
      return;
    }

    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    // Show confirmation dialog for new teams
    if (!team) {
      setConfirmSaveOpen(true);
      return;
    }

    // For existing teams (editing name), save directly
    handleSaveTeam();
  };

  const handleSaveTeam = async () => {
    setConfirmSaveOpen(false);
    setSaving(true);

    try {
      const budget = calculateBudget();

      if (team) {
        // Update existing team name via API
        const response = await fetch('/api/fantasy-teams', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: team.id, name: teamName }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update team');
        }
      } else {
        // Create new team via API
        const response = await fetch('/api/fantasy-teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: teamName,
            budget_remaining: budget,
            created_in_week: currentWeek?.week_number || 1,
            players: teamPlayers.map((p) => ({
              rl_player_id: p.rl_player_id,
              slot_type: p.slot_type,
              role: p.role,
              sub_order: p.sub_order,
              purchase_price: p.purchase_price,
            })),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create team');
        }

        const data = await response.json();
        setTeam(data.team);
      }

      toast.success('Team saved successfully!');
      setIsEditingName(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to save team');
    }

    setSaving(false);
  };

  const handleTransfer = async (sellPlayer: RLPlayer, buyPlayer: RLPlayer) => {
    if (!team || !currentWeek || !user) return;

    // Find the team player entry being sold
    const soldTeamPlayer = teamPlayers.find((p) => p.rl_player_id === sellPlayer.id);
    if (!soldTeamPlayer) return;

    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          weekId: currentWeek.id,
          soldPlayerId: sellPlayer.id,
          soldPrice: soldTeamPlayer.purchase_price,
          boughtPlayerId: buyPlayer.id,
          boughtPrice: buyPlayer.price,
          teamPlayerId: soldTeamPlayer.id,
          currentBudget: team.budget_remaining,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete transfer');
      }

      toast.success(`Transferred ${sellPlayer.name} for ${buyPlayer.name}`);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete transfer');
    }
  };

  const handleSwapPlayers = async (player1Id: string, player2Id: string) => {
    // Validate the swap first
    const validation = canSwapPlayers(teamPlayers, player1Id, player2Id);
    if (!validation.valid) {
      toast.error(validation.reason || 'Cannot swap these players');
      return;
    }

    // Find the two players
    const player1 = teamPlayers.find(
      (p) => p.rl_player_id === player1Id || p.rl_player?.id === player1Id
    );
    const player2 = teamPlayers.find(
      (p) => p.rl_player_id === player2Id || p.rl_player?.id === player2Id
    );

    if (!player1 || !player2) {
      toast.error('Players not found');
      return;
    }

    if (!team) {
      // Team not saved yet - update local state
      const updatedPlayers = teamPlayers.map((p) => {
        const id = p.rl_player_id || p.rl_player?.id;
        if (id === player1Id) {
          return {
            ...p,
            slot_type: player2.slot_type,
            role: player2.role,
            sub_order: player2.sub_order,
          };
        }
        if (id === player2Id) {
          return {
            ...p,
            slot_type: player1.slot_type,
            role: player1.role,
            sub_order: player1.sub_order,
          };
        }
        return p;
      });
      setTeamPlayers(updatedPlayers);
      toast.success('Players swapped');
    } else {
      // Team is saved - call API endpoint
      try {
        const response = await fetch('/api/fantasy-teams/swap-positions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: team.id,
            player1Id,
            player2Id,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to swap players');
        }

        toast.success('Players swapped');
        fetchData(); // Refresh data
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Failed to swap players');
      }
    }
  };

  // Check if can transfer
  const canTransfer = team && currentWeek?.transfer_window_open;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const budget = calculateBudget();
  const isTeamComplete = teamPlayers.length === 6;
  const selectedPlayerIds = teamPlayers.map((p) => p.rl_player_id);

  // Calculate budget for picker - add back the price of player being replaced
  const getPickerBudget = () => {
    const existingPlayer = teamPlayers.find((p) => {
      if (pickerState.slotType === 'active') {
        return p.slot_type === 'active' && p.role === pickerState.role;
      }
      return p.slot_type === 'substitute' && p.sub_order === pickerState.subOrder;
    });
    // Add back the price of the player being replaced
    return budget + (existingPlayer?.purchase_price || 0);
  };

  // Get selected player IDs excluding the one being replaced
  const getPickerSelectedIds = () => {
    return teamPlayers
      .filter((p) => {
        if (pickerState.slotType === 'active') {
          return !(p.slot_type === 'active' && p.role === pickerState.role);
        }
        return !(p.slot_type === 'substitute' && p.sub_order === pickerState.subOrder);
      })
      .map((p) => p.rl_player_id);
  };

  // Get the player ID being replaced in current slot (for constraint checks)
  const getCurrentSlotPlayerId = () => {
    const existingPlayer = teamPlayers.find((p) => {
      if (pickerState.slotType === 'active') {
        return p.slot_type === 'active' && p.role === pickerState.role;
      }
      return p.slot_type === 'substitute' && p.sub_order === pickerState.subOrder;
    });
    return existingPlayer?.rl_player_id;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {team ? 'My Team' : 'Create Your Team'}
          </h1>
          <p className="text-muted-foreground">
            {team
              ? 'Manage your fantasy team'
              : 'Select 6 players: 3 active (striker, midfield, goalkeeper) and 3 substitutes'}
          </p>
        </div>
        <div className="flex gap-2">
          {canTransfer && (
            <Button variant="outline" onClick={() => setTransferModalOpen(true)}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Transfer
            </Button>
          )}
          {(!team || isEditingName) && (
            <Button onClick={handleSaveClick} disabled={saving || !isTeamComplete}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Team'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Field visualization */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {isEditingName || !team ? (
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name..."
                  className="max-w-xs"
                />
              ) : (
                <>
                  <CardTitle>{team.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {!team && (
              <CardDescription>
                Click on a slot to add a player
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <FieldVisualization
              players={teamPlayers}
              onSlotClick={!team ? handleSlotClick : undefined}
              onRemovePlayer={!team ? handleRemovePlayer : undefined}
              onSwapPlayers={teamPlayers.length >= 2 ? handleSwapPlayers : undefined}
              disabled={false}
            />
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <BudgetDisplay budget={budget} />

          {/* Transfer window status */}
          {team && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Transfer Window</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-sm font-medium ${currentWeek?.transfer_window_open ? 'text-green-500' : 'text-red-500'}`}>
                  {currentWeek?.transfer_window_open ? 'Open' : 'Closed'}
                </div>
                {currentWeek?.transfer_window_closes_at && currentWeek.transfer_window_open && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Closes: {new Date(currentWeek.transfer_window_closes_at).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Team progress */}
          {!team && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Active Players</span>
                    <span>{teamPlayers.filter((p) => p.slot_type === 'active').length}/3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Substitutes</span>
                    <span>{teamPlayers.filter((p) => p.slot_type === 'substitute').length}/3</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(teamPlayers.length / 6) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Points this week (if team exists) */}
          {team && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Points This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Week {currentWeek?.week_number || '-'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Player picker modal */}
      <PlayerPicker
        open={pickerState.open}
        onClose={() => setPickerState({ ...pickerState, open: false })}
        onSelect={handleSelectPlayer}
        players={allPlayers}
        selectedPlayerIds={getPickerSelectedIds()}
        budget={getPickerBudget()}
        slotType={pickerState.slotType}
        role={pickerState.role}
        subOrder={pickerState.subOrder}
        currentTeamPlayers={teamPlayers}
        currentSlotPlayerId={getCurrentSlotPlayerId()}
      />

      {/* Transfer modal */}
      {team && (
        <TransferModal
          open={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          onConfirm={handleTransfer}
          teamPlayers={teamPlayers}
          allPlayers={allPlayers}
          budget={team.budget_remaining}
        />
      )}

      {/* Confirmation dialog for first-time save */}
      <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Team Creation
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                <strong>Are you sure you want to lock in this team?</strong>
              </p>
              <p>
                Once you save your team, you <strong>cannot recreate it</strong> or make bulk changes.
                You will only be able to make <strong>1 transfer per week</strong> during the transfer window.
              </p>
              <p className="text-yellow-500">
                Make sure you are happy with your player selections and their positions before confirming!
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmSaveOpen(false)}>
              Go Back & Review
            </Button>
            <Button onClick={handleSaveTeam} disabled={saving}>
              {saving ? 'Saving...' : 'Yes, Lock In My Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
