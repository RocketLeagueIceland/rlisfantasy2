'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Season } from '@/types';

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    number: 12,
    name: '',
    initial_budget: 100000000,
    starts_at: '',
  });
  const supabase = createClient();

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('number', { ascending: false });

    if (error) {
      toast.error('Failed to load seasons');
      console.error(error);
    } else {
      setSeasons(data || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maxNumber = Math.max(0, ...(data?.map((s: any) => s.number) || []));
      setFormData((f) => ({ ...f, number: maxNumber + 1, name: `Season ${maxNumber + 1}` }));
    }
    setLoading(false);
  };

  const handleCreateSeason = async () => {
    if (!formData.number || !formData.name) {
      toast.error('Season number and name are required');
      return;
    }

    const { error } = await supabase.from('seasons').insert({
      number: formData.number,
      name: formData.name,
      initial_budget: formData.initial_budget,
      starts_at: formData.starts_at || null,
      is_current: false,
    });

    if (error) {
      toast.error('Failed to create season');
      console.error(error);
    } else {
      toast.success('Season created — use "Set Current" when it should go live');
      fetchSeasons();
      setDialogOpen(false);
    }
  };

  const handleSetCurrent = async (season: Season) => {
    if (
      !confirm(
        `Make ${season.name} the active season?\n\n` +
          'From that moment everyone builds a new team for this season, and the previous season becomes read-only history under Past Seasons.'
      )
    ) {
      return;
    }

    // Clear the flag first, then set the new one (the DB allows at most one
    // current season at a time).
    const { error: clearError } = await supabase
      .from('seasons')
      .update({ is_current: false })
      .eq('is_current', true);

    if (clearError) {
      toast.error('Failed to switch season');
      console.error(clearError);
      return;
    }

    const { error: setError } = await supabase
      .from('seasons')
      .update({ is_current: true })
      .eq('id', season.id);

    if (setError) {
      toast.error('Failed to switch season — no season is currently active! Try again.');
      console.error(setError);
    } else {
      toast.success(`${season.name} is now the active season`);
    }
    fetchSeasons();
  };

  const formatBudget = (amount: number) => {
    return `${(amount / 1000000).toFixed(0)}M`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('is-IS');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Seasons</h1>
          <p className="text-muted-foreground">
            Create seasons and control which one is live
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Season
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seasons</CardTitle>
          <CardDescription>
            The current season is what every page and new fantasy team uses; older seasons stay
            browsable under Past Seasons
          </CardDescription>
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
                  <TableHead>Season</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasons.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell className="font-medium">{season.name}</TableCell>
                    <TableCell>{formatBudget(season.initial_budget)} kr</TableCell>
                    <TableCell>{formatDate(season.starts_at)}</TableCell>
                    <TableCell>
                      {season.is_current ? (
                        <Badge className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Current
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!season.is_current && (
                        <Button variant="outline" size="sm" onClick={() => handleSetCurrent(season)}>
                          Set Current
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {seasons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No seasons found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Season Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Season</DialogTitle>
            <DialogDescription>
              The season is created as archived — set it current when ready. Then add its players
              (or copy last season&apos;s roster) and create Week 1.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="season_number">Season Number</Label>
              <Input
                id="season_number"
                type="number"
                value={formData.number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    number: parseInt(e.target.value) || 0,
                    name: `Season ${parseInt(e.target.value) || 0}`,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="season_name">Name</Label>
              <Input
                id="season_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial_budget">Starting Budget (kr)</Label>
              <Input
                id="initial_budget"
                type="number"
                value={formData.initial_budget}
                onChange={(e) =>
                  setFormData({ ...formData, initial_budget: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="starts_at">Start Date (optional)</Label>
              <Input
                id="starts_at"
                type="date"
                value={formData.starts_at}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSeason}>Create Season</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
