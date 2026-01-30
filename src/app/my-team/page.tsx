'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Save, Edit2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  FieldVisualization,
  BudgetDisplay,
  PlayerPicker,
  TransferModal,
} from '@/components/fantasy';
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
  const supabase = createClient();

  // Calculate current budget
  const calculateBudget = () => {
    if (team) {
      return team.budget_remaining;
    }
    const spent = teamPlayers.reduce((sum, p) => sum + p.purchase_price, 0);
    return INITIAL_BUDGET - spent;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Check auth
      console.log('[MyTeam] Checking auth...');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      console.log('[MyTeam] Auth result:', authUser?.id, 'Error:', authError?.message);

      if (!authUser) {
        router.push('/login?redirect=/my-team');
        return;
      }
      setUser({ id: authUser.id });

      // Fetch all players
      console.log('[MyTeam] Fetching players...');
      const { data: playersData, error: playersError } = await supabase
        .from('rl_players')
        .select('*')
        .eq('is_active', true)
        .order('name');
      console.log('[MyTeam] Players:', playersData?.length, 'Error:', playersError?.message);
      setAllPlayers(playersData || []);

      // Fetch current week (use maybeSingle to handle no weeks)
      console.log('[MyTeam] Fetching current week...');
      const { data: weekData, error: weekError } = await supabase
        .from('weeks')
        .select('*')
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      console.log('[MyTeam] Week:', weekData, 'Error:', weekError?.message);
      setCurrentWeek(weekData);

      // Fetch user's team (use maybeSingle to handle no team)
      console.log('[MyTeam] Fetching team...');
      const { data: teamData, error: teamError } = await supabase
        .from('fantasy_teams')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();
      console.log('[MyTeam] Team:', teamData, 'Error:', teamError?.message);

      if (teamData) {
        setTeam(teamData);
        setTeamName(teamData.name);

        // Fetch team players with rl_player data
        console.log('[MyTeam] Fetching team players...');
        const { data: teamPlayersData, error: teamPlayersError } = await supabase
          .from('fantasy_team_players')
          .select('*, rl_player:rl_players(*)')
          .eq('fantasy_team_id', teamData.id);
        console.log('[MyTeam] Team players:', teamPlayersData?.length, 'Error:', teamPlayersError?.message);
        setTeamPlayers(teamPlayersData || []);
      }

      setLoading(false);
    } catch (e) {
      console.error('[MyTeam] Unexpected error:', e);
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

    setTeamPlayers([...teamPlayers, newTeamPlayer]);
    setPickerState({ ...pickerState, open: false });
  };

  const handleSaveTeam = async () => {
    if (!user) return;

    if (teamPlayers.length !== 6) {
      toast.error('You must select exactly 6 players');
      return;
    }

    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    setSaving(true);

    try {
      const budget = calculateBudget();

      if (team) {
        // Update existing team name
        await supabase
          .from('fantasy_teams')
          .update({ name: teamName })
          .eq('id', team.id);
      } else {
        // Create new team
        const { data: newTeam, error: teamError } = await supabase
          .from('fantasy_teams')
          .insert({
            user_id: user.id,
            name: teamName,
            budget_remaining: budget,
            created_in_week: currentWeek?.week_number || 1,
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Insert team players
        const playersToInsert = teamPlayers.map((p) => ({
          fantasy_team_id: newTeam.id,
          rl_player_id: p.rl_player_id,
          slot_type: p.slot_type,
          role: p.role,
          sub_order: p.sub_order,
          purchase_price: p.purchase_price,
        }));

        const { error: playersError } = await supabase
          .from('fantasy_team_players')
          .insert(playersToInsert);

        if (playersError) throw playersError;

        setTeam(newTeam);
      }

      toast.success('Team saved successfully!');
      setIsEditingName(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error(error);
      toast.error('Failed to save team');
    }

    setSaving(false);
  };

  const handleTransfer = async (sellPlayer: RLPlayer, buyPlayer: RLPlayer) => {
    if (!team || !currentWeek) return;

    // Find the team player entry being sold
    const soldTeamPlayer = teamPlayers.find((p) => p.rl_player_id === sellPlayer.id);
    if (!soldTeamPlayer) return;

    try {
      // Create transfer record
      const { error: transferError } = await supabase.from('transfers').insert({
        fantasy_team_id: team.id,
        week_id: currentWeek.id,
        sold_player_id: sellPlayer.id,
        sold_price: soldTeamPlayer.purchase_price,
        bought_player_id: buyPlayer.id,
        bought_price: buyPlayer.price,
      });

      if (transferError) throw transferError;

      // Update team player
      const { error: updateError } = await supabase
        .from('fantasy_team_players')
        .update({
          rl_player_id: buyPlayer.id,
          purchase_price: buyPlayer.price,
        })
        .eq('id', soldTeamPlayer.id);

      if (updateError) throw updateError;

      // Update budget
      const newBudget = team.budget_remaining + soldTeamPlayer.purchase_price - buyPlayer.price;
      await supabase
        .from('fantasy_teams')
        .update({ budget_remaining: newBudget })
        .eq('id', team.id);

      toast.success(`Transferred ${sellPlayer.name} for ${buyPlayer.name}`);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to complete transfer');
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
            <Button onClick={handleSaveTeam} disabled={saving || !isTeamComplete}>
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
              disabled={!!team}
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
        selectedPlayerIds={selectedPlayerIds}
        budget={budget}
        slotType={pickerState.slotType}
        role={pickerState.role}
        subOrder={pickerState.subOrder}
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
    </div>
  );
}
