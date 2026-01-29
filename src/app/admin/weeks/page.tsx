'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Clock, BarChart3, CheckCircle, XCircle } from 'lucide-react';
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
import type { Week } from '@/types';

export default function AdminWeeksPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    week_number: 1,
    broadcast_starts_at: '',
    ballchasing_group_id: '',
  });
  const supabase = createClient();

  useEffect(() => {
    fetchWeeks();
  }, []);

  const fetchWeeks = async () => {
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .order('week_number', { ascending: false });

    if (error) {
      toast.error('Failed to load weeks');
      console.error(error);
    } else {
      setWeeks(data || []);
      // Set next week number for form
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maxWeek = Math.max(0, ...(data?.map((w: any) => w.week_number) || []));
      setFormData((f) => ({ ...f, week_number: maxWeek + 1 }));
    }
    setLoading(false);
  };

  const handleCreateWeek = async () => {
    if (!formData.week_number) {
      toast.error('Week number is required');
      return;
    }

    const weekData = {
      week_number: formData.week_number,
      broadcast_starts_at: formData.broadcast_starts_at || null,
      ballchasing_group_id: formData.ballchasing_group_id || null,
      transfer_window_open: false,
      stats_fetched: false,
      scores_published: false,
    };

    const { error } = await supabase.from('weeks').insert(weekData);

    if (error) {
      toast.error('Failed to create week');
      console.error(error);
    } else {
      toast.success('Week created');
      fetchWeeks();
      setDialogOpen(false);
    }
  };

  const toggleTransferWindow = async (week: Week) => {
    const { error } = await supabase
      .from('weeks')
      .update({ transfer_window_open: !week.transfer_window_open })
      .eq('id', week.id);

    if (error) {
      toast.error('Failed to update transfer window');
      console.error(error);
    } else {
      toast.success(
        week.transfer_window_open
          ? 'Transfer window closed'
          : 'Transfer window opened'
      );
      fetchWeeks();
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('is-IS', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Weeks</h1>
          <p className="text-muted-foreground">
            Create weeks, manage transfer windows, and import stats
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Week
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Season Weeks</CardTitle>
          <CardDescription>
            Manage the competition schedule
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
                  <TableHead>Week</TableHead>
                  <TableHead>Broadcast</TableHead>
                  <TableHead>Transfer Window</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Scores</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeks.map((week) => (
                  <TableRow key={week.id}>
                    <TableCell className="font-medium">
                      Week {week.week_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(week.broadcast_starts_at)}
                      </div>
                      {week.transfer_window_closes_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Transfers close: {formatDate(week.transfer_window_closes_at)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={week.transfer_window_open ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleTransferWindow(week)}
                      >
                        {week.transfer_window_open ? 'Open' : 'Closed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {week.stats_fetched ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {week.scores_published ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/stats/${week.id}`}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Stats
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {weeks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No weeks created yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Week Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Week</DialogTitle>
            <DialogDescription>
              Set up a new competition week
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="week_number">Week Number</Label>
              <Input
                id="week_number"
                type="number"
                value={formData.week_number}
                onChange={(e) =>
                  setFormData({ ...formData, week_number: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broadcast">Broadcast Date/Time (optional)</Label>
              <Input
                id="broadcast"
                type="datetime-local"
                value={formData.broadcast_starts_at}
                onChange={(e) =>
                  setFormData({ ...formData, broadcast_starts_at: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Transfer window will auto-close 1 hour before broadcast
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ballchasing">Ballchasing Group ID (optional)</Label>
              <Input
                id="ballchasing"
                value={formData.ballchasing_group_id}
                onChange={(e) =>
                  setFormData({ ...formData, ballchasing_group_id: e.target.value })
                }
                placeholder="e.g., abc123xyz"
              />
              <p className="text-xs text-muted-foreground">
                From ballchasing.com group URL
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWeek}>Create Week</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
