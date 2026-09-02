'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  ChefHat, ClipboardList, LayoutDashboard, LogOut, Package, Receipt, UsersRound, UtensilsCrossed, Armchair,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Resource } from '@/lib/types';

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; resource: Resource }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, resource: 'dashboard' },
  { href: '/orders', label: 'Orders', icon: ClipboardList, resource: 'orders' },
  { href: '/tables', label: 'Tables', icon: Armchair, resource: 'tables' },
  { href: '/kitchen', label: 'Kitchen', icon: ChefHat, resource: 'kitchen' },
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed, resource: 'menu' },
  { href: '/inventory', label: 'Inventory', icon: Package, resource: 'inventory' },
  { href: '/bills', label: 'Bills', icon: Receipt, resource: 'bills' },
  { href: '/users', label: 'Staff', icon: UsersRound, resource: 'users' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }
  if (!user) return null;

  const visible = NAV.filter((item) => can(item.resource));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="px-5 py-5">
          <p className="text-sm font-semibold">Spice Route</p>
          <p className="text-xs text-muted-foreground">Restaurant Manager</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {visible.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                pathname.startsWith(href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="px-2 text-sm font-medium">{user.name}</p>
          <p className="px-2 pb-2 text-xs capitalize text-muted-foreground">{user.role}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => void logout()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 overflow-x-auto border-b px-4 py-2 md:hidden">
          {visible.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm',
                pathname.startsWith(href) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
