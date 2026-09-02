'use client';

import { Armchair, ClipboardList, PackageX, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { useDashboard } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { money, dateTime } from '@/lib/format';

function Stat({ label, value, hint, icon: Icon }: {
  label: string; value: string; hint?: string; icon: typeof Wallet;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </>
    );
  }

  const busiest = Math.max(1, ...data.popularItems.map((p) => p.quantity));

  return (
    <>
      <PageHeader title="Dashboard" description="Today at a glance" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue today" value={money(data.revenueToday)} hint={`${data.billsToday} bills paid`} icon={Wallet} />
        <Stat label="Tables free" value={`${data.tables.available} / ${data.tables.total}`}
          hint={`${data.tables.occupied} occupied`} icon={Armchair} />
        <Stat label="Active orders" value={String(data.activeOrders)} hint="being prepared or served" icon={ClipboardList} />
        <Stat label="Low stock" value={String(data.lowStockCount)} hint="ingredients at or below reorder level" icon={PackageX} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Most popular dishes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.popularItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed orders yet.</p>
            ) : data.popularItems.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">{item.quantity} sold · {money(item.revenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(item.quantity / busiest) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.recentBills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bills paid yet.</p>
            ) : data.recentBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                <div>
                  <p className="font-medium">{bill.customerName}</p>
                  <p className="text-xs text-muted-foreground">{bill.billNumber} · {dateTime(bill.paidAt)}</p>
                </div>
                <span className="font-medium">{money(bill.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
