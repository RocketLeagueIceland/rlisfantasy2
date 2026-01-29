import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Users, Trophy, Calendar, Home } from 'lucide-react';

export const dynamic = 'force-dynamic';

const adminNavLinks = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/players', label: 'Players', icon: Users },
  { href: '/admin/weeks', label: 'Weeks', icon: Calendar },
  { href: '/admin/users', label: 'Users', icon: Trophy },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!(userData as { is_admin: boolean } | null)?.is_admin) {
    redirect('/');
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] gap-6">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-card">
        <nav className="sticky top-20 p-4 space-y-2">
          <h2 className="px-3 text-lg font-semibold mb-4">Admin Panel</h2>
          {adminNavLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 py-6 pr-6">
        {children}
      </div>
    </div>
  );
}
