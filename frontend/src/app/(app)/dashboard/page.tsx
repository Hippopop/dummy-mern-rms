'use client';

import { useDashboard, useOrders } from '@/hooks/use-api';
import { Panel, PanelHeader, Label } from '@/components/panel';
import { money, time } from '@/lib/format';

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Panel className="px-4 py-3.5">
      <Label>{label}</Label>
      <p className="figure mt-2 text-[34px] leading-none">{value}</p>
      <p className="mt-2 text-[12.5px] text-primary">{note}</p>
    </Panel>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: orders } = useOrders();

  if (isLoading || !data) {
    return <p className="label-tech">Reading service data…</p>;
  }

  // Revenue by hour, derived from the bills paid today.
  const byHour = new Map<number, number>();
  for (const bill of data.recentBills) {
    const hour = new Date(bill.paidAt).getHours();
    byHour.set(hour, (byHour.get(hour) ?? 0) + bill.total);
  }
  const hours = [...byHour.keys()].sort((a, b) => a - b);
  const peak = Math.max(1, ...byHour.values());
  const busiest = hours.length ? hours.reduce((a, b) => (byHour.get(b)! > byHour.get(a)! ? b : a)) : -1;

  const topCount = Math.max(1, ...data.popularItems.map((p) => p.quantity));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tables in service" value={`${data.tables.occupied}/${data.tables.total}`}
          note={`${data.tables.available} ready to seat`} />
        <Stat label="Live tickets" value={String(data.activeOrders)}
          note={orders?.length ? `${orders.length} open on the floor` : 'nothing in service'} />
        <Stat label="Settled today" value={money(data.revenueToday)}
          note={`${data.billsToday} ${data.billsToday === 1 ? 'bill' : 'bills'} closed`} />
        <Stat label="Below par" value={String(data.lowStockCount)}
          note={data.lowStockCount ? `${data.lowStockCount === 1 ? 'ingredient needs' : 'ingredients need'} restocking` : 'all stock above par'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <Panel>
          <PanelHeader title="Revenue by hour" aside="Fig. 1 — settled bills" />
          <div className="px-4 pb-4">
            {hours.length === 0 ? (
              <p className="py-14 text-center text-[13px] text-muted-foreground">No settled bills yet today.</p>
            ) : (
              <div className="flex h-56 items-end justify-start gap-3">
                {hours.map((hour) => {
                  const value = byHour.get(hour)!;
                  return (
                    <div key={hour} className="flex max-w-20 flex-1 flex-col items-center gap-1.5">
                      <span className="text-[11px] tabular-nums text-muted-foreground">{money(value)}</span>
                      <div
                        className={hour === busiest ? 'w-full bg-data-strong' : 'w-full bg-data-fill'}
                        style={{ height: `${Math.max(6, (value / peak) * 168)}px` }}
                      />
                      <span className="text-[11px] tabular-nums text-muted-foreground">{String(hour).padStart(2, '0')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Top sellers tonight" />
          <div className="space-y-3.5 px-4 pb-4">
            {data.popularItems.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">No completed orders yet.</p>
            ) : data.popularItems.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13.5px] font-medium">{item.name}</span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums">{item.quantity}×</span>
                </div>
                <div className="h-1.5 bg-data-track">
                  <div className="h-1.5 bg-primary" style={{ width: `${(item.quantity / topCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Recent payments" aside={`${data.recentBills.length} shown`} />
        <div className="px-4 pb-4">
          {data.recentBills.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">No bills paid yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="label-tech py-2 text-left">Bill</th>
                  <th className="label-tech py-2 text-left">Customer</th>
                  <th className="label-tech py-2 text-left">Paid</th>
                  <th className="label-tech py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBills.map((bill) => (
                  <tr key={bill.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 text-[13.5px] font-medium">{bill.billNumber}</td>
                    <td className="py-2.5 text-[13.5px]">{bill.customerName}</td>
                    <td className="py-2.5 text-[13px] tabular-nums text-muted-foreground">{time(bill.paidAt)}</td>
                    <td className="py-2.5 text-right text-[13.5px] font-semibold tabular-nums">{money(bill.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}
