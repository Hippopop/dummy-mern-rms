'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard, useKitchenQueue } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import type { Resource } from '@/lib/types';

const NAV: { href: string; label: string; resource: Resource }[] = [
  { href: '/dashboard', label: 'Service dashboard', resource: 'dashboard' },
  { href: '/tables', label: 'Floor plan', resource: 'tables' },
  { href: '/orders', label: 'Order taking', resource: 'orders' },
  { href: '/kitchen', label: 'Kitchen display', resource: 'kitchen' },
  { href: '/menu', label: 'Menu management', resource: 'menu' },
  { href: '/inventory', label: 'Inventory', resource: 'inventory' },
  { href: '/bills', label: 'Billing & payments', resource: 'bills' },
  { href: '/users', label: 'Staff accounts', resource: 'users' },
];

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const now = useClock();

  const { data: kitchen } = useKitchenQueue();
  const { data: dashboard } = useDashboard();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="label-tech">Loading terminal…</span>
      </div>
    );
  }
  if (!user) return null;

  const badges: Partial<Record<Resource, number | undefined>> = {
    kitchen: kitchen?.pendingItems || undefined,
    orders: dashboard?.activeOrders || undefined,
    inventory: dashboard?.lowStockCount || undefined,
  };

  const visible = NAV.filter((item) => can(item.resource));
  const current = visible.findIndex((item) => pathname.startsWith(item.href));
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const stamp = now
    ? `${now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()} · ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
    : '';

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border md:flex">
        <div className="border-b border-border px-5 py-4">
          <p className="label-tech text-primary">Restaurant OS</p>
          <p className="display mt-1 text-[22px] leading-none">Spice Route</p>
          <p className="label-tech mt-1.5">Dinner service · Rev. 1.0</p>
        </div>

        <nav className="flex-1 py-1">
          {visible.map((item, index) => {
            const active = pathname.startsWith(item.href);
            const badge = badges[item.resource];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 border-l-2 py-2.5 pr-4 pl-4 text-[13.5px] transition-colors',
                  active
                    ? 'border-primary bg-accent font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="label-tech w-4 shrink-0 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {badge ? <span className="text-[13px] font-semibold text-primary tabular-nums">{badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-border px-4 py-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center border border-border text-[11px] font-semibold tracking-wide">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-tight">{user.name}</p>
            <p className="truncate text-[11px] capitalize text-muted-foreground">{user.role}</p>
          </div>
          <button type="button" onClick={() => void logout()}
            className="label-tech hover:text-foreground">Exit</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {visible.map((item) => (
            <Link key={item.href} href={item.href}
              className={cn('whitespace-nowrap border px-2.5 py-1 text-[12px]',
                pathname.startsWith(item.href) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground')}>
              {item.label}
            </Link>
          ))}
        </div>

        <ModuleHeader
          index={current >= 0 ? current + 1 : 0}
          title={visible[current]?.label ?? 'Terminal'}
          stamp={stamp}
        />

        <main className="flex-1 px-5 py-5 md:px-7 md:py-6">{children}</main>
      </div>
    </div>
  );
}

function ModuleHeader({ index, title, stamp }: { index: number; title: string; stamp: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 pb-4 md:px-7">
      <div>
        <p className="label-tech">Module {String(index).padStart(2, '0')}</p>
        <h1 className="display mt-1 text-[26px] leading-none">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="label-tech tabular-nums">{stamp}</span>
        <span className="label-tech flex items-center gap-2 text-foreground">
          <span className="size-2 bg-primary" />
          Terminal online
        </span>
      </div>
    </header>
  );
}

/** In-page heading. The module name lives in the shell header, so `title` is for
 *  record identity (an order or bill number) on detail screens. */
export function PageHeader({ title, description, action }: { title?: string; description?: string; action?: React.ReactNode }) {
  if (!title && !description && !action) return null;
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {title ? <h2 className="display text-[19px] leading-none">{title}</h2> : null}
        {description ? <p className={cn('label-tech', title && 'mt-1.5')}>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
