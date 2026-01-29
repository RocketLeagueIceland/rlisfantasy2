import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trophy, Calendar, UserCheck } from 'lucide-react';
import Link from 'next/link';
import type { Week } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch stats
  const [
    { count: playerCount },
    { count: teamCount },
    { count: userCount },
    weekResult,
  ] = await Promise.all([
    supabase.from('rl_players').select('*', { count: 'exact', head: true }),
    supabase.from('fantasy_teams').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('weeks').select('*').order('week_number', { ascending: false }).limit(1).single(),
  ]);

  const currentWeek = weekResult.data as Week | null;

  const stats = [
    {
      title: 'RL Players',
      value: playerCount || 0,
      description: 'Registered Rocket League players',
      icon: Users,
      href: '/admin/players',
    },
    {
      title: 'Fantasy Teams',
      value: teamCount || 0,
      description: 'Active fantasy teams',
      icon: Trophy,
      href: '/admin/users',
    },
    {
      title: 'Users',
      value: userCount || 0,
      description: 'Registered users',
      icon: UserCheck,
      href: '/admin/users',
    },
    {
      title: 'Current Week',
      value: currentWeek?.week_number || '-',
      description: currentWeek?.transfer_window_open ? 'Transfer window open' : 'Transfer window closed',
      icon: Calendar,
      href: '/admin/weeks',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage the RLIS Fantasy League
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/admin/players"
              className="block rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <div className="font-medium">Manage Players</div>
              <div className="text-sm text-muted-foreground">
                Add, edit, or deactivate RL players
              </div>
            </Link>
            <Link
              href="/admin/weeks"
              className="block rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <div className="font-medium">Manage Weeks</div>
              <div className="text-sm text-muted-foreground">
                Create weeks, manage transfer windows, import stats
              </div>
            </Link>
            <Link
              href="/admin/users"
              className="block rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-muted-foreground">
                View users and assign admin roles
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Week Status</CardTitle>
            <CardDescription>Week {currentWeek?.week_number || '-'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Transfer Window</span>
              <span className={`text-sm font-medium ${currentWeek?.transfer_window_open ? 'text-green-500' : 'text-red-500'}`}>
                {currentWeek?.transfer_window_open ? 'Open' : 'Closed'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Stats Fetched</span>
              <span className={`text-sm font-medium ${currentWeek?.stats_fetched ? 'text-green-500' : 'text-yellow-500'}`}>
                {currentWeek?.stats_fetched ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Scores Published</span>
              <span className={`text-sm font-medium ${currentWeek?.scores_published ? 'text-green-500' : 'text-yellow-500'}`}>
                {currentWeek?.scores_published ? 'Yes' : 'No'}
              </span>
            </div>
            {currentWeek?.broadcast_starts_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Broadcast</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(currentWeek.broadcast_starts_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
