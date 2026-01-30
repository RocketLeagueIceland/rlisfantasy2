'use client';

import { useState, useEffect } from 'react';
import { Search, Shield, ShieldOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { User, FantasyTeam } from '@/types';

interface UserWithTeam extends User {
  fantasy_teams: FantasyTeam[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*, fantasy_teams(*)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load users');
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const toggleAdmin = async (user: User) => {
    const { error } = await supabase
      .from('users')
      .update({ is_admin: !user.is_admin })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update user');
      console.error(error);
    } else {
      const displayName = user.username || user.email || 'user';
      toast.success(
        user.is_admin
          ? `Removed admin from ${displayName}`
          : `Made ${displayName} an admin`
      );
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Users</h1>
        <p className="text-muted-foreground">
          View users and manage admin roles
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
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
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fantasy Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback>
                            {(user.username || user.email || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username || user.email || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {user.fantasy_teams && user.fantasy_teams.length > 0 ? (
                        <span>{user.fantasy_teams[0].name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_admin ? 'default' : 'secondary'}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAdmin(user)}
                      >
                        {user.is_admin ? (
                          <>
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Remove Admin
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Make Admin
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
