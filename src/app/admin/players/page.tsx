'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { RLPlayer, RLTeam } from '@/types';
import { RL_TEAMS, RL_TEAM_NAMES } from '@/lib/scoring/constants';

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<RLPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<RLPlayer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    team: '' as RLTeam | '',
    price: 1000000,
    ballchasing_id: '',
    aliases: [] as string[],
    is_active: true,
  });
  const [newAlias, setNewAlias] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('rl_players')
      .select('*')
      .order('team')
      .order('name');

    if (error) {
      toast.error('Failed to load players');
      console.error(error);
    } else {
      setPlayers(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (player?: RLPlayer) => {
    if (player) {
      setEditingPlayer(player);
      setFormData({
        name: player.name,
        team: player.team,
        price: player.price,
        ballchasing_id: player.ballchasing_id || '',
        aliases: player.aliases || [],
        is_active: player.is_active,
      });
    } else {
      setEditingPlayer(null);
      setFormData({
        name: '',
        team: '',
        price: 1000000,
        ballchasing_id: '',
        aliases: [],
        is_active: true,
      });
    }
    setNewAlias('');
    setDialogOpen(true);
  };

  const handleAddAlias = () => {
    if (newAlias.trim() && !formData.aliases.includes(newAlias.trim())) {
      setFormData({ ...formData, aliases: [...formData.aliases, newAlias.trim()] });
      setNewAlias('');
    }
  };

  const handleRemoveAlias = (aliasToRemove: string) => {
    setFormData({
      ...formData,
      aliases: formData.aliases.filter((a) => a !== aliasToRemove),
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.team) {
      toast.error('Name and team are required');
      return;
    }

    const playerData = {
      name: formData.name,
      team: formData.team as RLTeam,
      price: formData.price,
      ballchasing_id: formData.ballchasing_id || null,
      aliases: formData.aliases,
      is_active: formData.is_active,
    };

    if (editingPlayer) {
      const { error } = await supabase
        .from('rl_players')
        .update(playerData)
        .eq('id', editingPlayer.id);

      if (error) {
        toast.error('Failed to update player');
        console.error(error);
      } else {
        toast.success('Player updated');
        fetchPlayers();
      }
    } else {
      const { error } = await supabase.from('rl_players').insert(playerData);

      if (error) {
        toast.error('Failed to create player');
        console.error(error);
      } else {
        toast.success('Player created');
        fetchPlayers();
      }
    }

    setDialogOpen(false);
  };

  const handleDelete = async (player: RLPlayer) => {
    if (!confirm(`Are you sure you want to delete ${player.name}?`)) return;

    const { error } = await supabase
      .from('rl_players')
      .delete()
      .eq('id', player.id);

    if (error) {
      toast.error('Failed to delete player. They may be on a fantasy team.');
      console.error(error);
    } else {
      toast.success('Player deleted');
      fetchPlayers();
    }
  };

  const filteredPlayers = players.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.team.toLowerCase().includes(searchLower) ||
      (p.aliases && p.aliases.some((a) => a.toLowerCase().includes(searchLower)))
    );
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('is-IS').format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Players</h1>
          <p className="text-muted-foreground">
            Add and manage Rocket League players
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Player
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Aliases</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Image
                          src={`/Teams/${player.team}.png`}
                          alt={player.team}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                        <span className="text-sm">{RL_TEAM_NAMES[player.team]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {player.aliases && player.aliases.length > 0 ? (
                          player.aliases.map((alias) => (
                            <Badge key={alias} variant="outline" className="text-xs">
                              {alias}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(player.price)} kr</TableCell>
                    <TableCell>
                      <Badge variant={player.is_active ? 'default' : 'secondary'}>
                        {player.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(player)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(player)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPlayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No players found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlayer ? 'Edit Player' : 'Add Player'}
            </DialogTitle>
            <DialogDescription>
              {editingPlayer
                ? 'Update player information'
                : 'Add a new Rocket League player'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Player name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select
                value={formData.team}
                onValueChange={(value) =>
                  setFormData({ ...formData, team: value as RLTeam })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {RL_TEAMS.map((team) => (
                    <SelectItem key={team} value={team}>
                      <div className="flex items-center gap-2">
                        <Image
                          src={`/Teams/${team}.png`}
                          alt={team}
                          width={20}
                          height={20}
                          className="rounded"
                        />
                        {RL_TEAM_NAMES[team]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (kr)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                }
                placeholder="1000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ballchasing_id">Ballchasing ID (optional)</Label>
              <Input
                id="ballchasing_id"
                value={formData.ballchasing_id}
                onChange={(e) =>
                  setFormData({ ...formData, ballchasing_id: e.target.value })
                }
                placeholder="Player's ballchasing.com ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Aliases (alternative names in replays)</Label>
              <div className="flex gap-2">
                <Input
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="Add an alias..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAlias();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddAlias}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.aliases.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.aliases.map((alias) => (
                    <Badge key={alias} variant="secondary" className="flex items-center gap-1">
                      {alias}
                      <button
                        type="button"
                        onClick={() => handleRemoveAlias(alias)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPlayer ? 'Save Changes' : 'Add Player'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
