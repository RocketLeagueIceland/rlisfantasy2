'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Clock, BarChart3, CheckCircle, XCircle, Pencil, Link as LinkIcon } from 'lucide-react';
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

// Extract group ID from ballchasing URL or return as-is if already an ID
function extractBallchasingGroupId(input: string): string {
  if (!input) return '';

  // If it's a URL, extract the group ID
  // Example: https://ballchasing.com/group/rlis-season-2-week-1-xyz123
  const urlMatch = input.match(/ballchasing\.com\/group\/([^/?#]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Otherwise return as-is (assume it's already an ID)
  return input.trim();
}

export default function AdminWeeksPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [formData, setFormData] = useState({
    week_number: 1,
    broadcast_starts_at: '',
  });
  const [ballchasingUrl, setBallchasingUrl] = useState('');
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

  const handleOpenEditDialog = (week: Week) => {
    setEditingWeek(week);
    setBallchasingUrl(week.ballchasing_group_id || '');
    setEditDialogOpen(true);
  };

  const handleUpdateWeek = async () => {
    if (!editingWeek) return;

    const groupId = extractBallchasingGroupId(ballchasingUrl);

    const { error } = await supabase
      .from('weeks')
      .update({ ballchasing_group_id: groupId || null })
      .eq('id', editingWeek.id);

    if (error) {
      toast.error('Failed to update week');
      console.error(error);
    } else {
      toast.success('Week updated');
      fetchWeeks();
      setEditDialogOpen(false);
      setEditingWeek(null);
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
                  <TableHead>Ballchasing</TableHead>
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
                      <div className="flex items-center gap-2">
                        {week.ballchasing_group_id ? (
                          <a
                            href={`https://ballchasing.com/group/${week.ballchasing_group_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <LinkIcon className="h-3 w-3" />
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleOpenEditDialog(week)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWeek}>Create Week</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Week Dialog (Ballchasing URL) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Week {editingWeek?.week_number}</DialogTitle>
            <DialogDescription>
              Set the ballchasing group for this week
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ballchasing_url">Ballchasing Group URL or ID</Label>
              <Input
                id="ballchasing_url"
                value={ballchasingUrl}
                onChange={(e) => setBallchasingUrl(e.target.value)}
                placeholder="Paste the full ballchasing.com group URL..."
              />
              <p className="text-xs text-muted-foreground">
                Example: https://ballchasing.com/group/rlis-season-2-week-1
              </p>
              {ballchasingUrl && (
                <p className="text-xs text-muted-foreground">
                  Extracted ID: <code className="bg-muted px-1 rounded">{extractBallchasingGroupId(ballchasingUrl)}</code>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWeek}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
