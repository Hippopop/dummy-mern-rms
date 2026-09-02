'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { useOrders } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { money, time } from '@/lib/format';

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const { can } = useAuth();

  return (
    <>
      <PageHeader description={`${orders?.length ?? 0} orders open on the floor`}
        action={can('orders', 'write') ? <Button size="sm" asChild><Link href="/orders/new">Take an order</Link></Button> : undefined} />

      {isLoading ? <Skeleton className="h-64" /> : orders?.length === 0 ? (
        <Panel className="py-16 text-center"><span className="label-tech">No open orders.</span></Panel>
      ) : (
        <Panel className="px-4 py-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="label-tech py-2.5 text-left">Order</th>
                <th className="label-tech py-2.5 text-left">Table</th>
                <th className="label-tech py-2.5 text-left">Customer</th>
                <th className="label-tech py-2.5 text-left">Waiter</th>
                <th className="label-tech py-2.5 text-left">Status</th>
                <th className="label-tech py-2.5 text-right">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="py-3">
                    <span className="text-[13.5px] font-medium">{order.orderNumber}</span>
                    <span className="block text-[11.5px] tabular-nums text-muted-foreground">{time(order.placedAt)}</span>
                  </td>
                  <td className="py-3 text-[13.5px]">{order.table?.label}</td>
                  <td className="py-3">
                    <span className="text-[13.5px]">{order.customer?.name}</span>
                    <span className="block text-[11.5px] tabular-nums text-muted-foreground">{order.customer?.phone}</span>
                  </td>
                  <td className="py-3 text-[13.5px] text-muted-foreground">{order.waiter?.name ?? '—'}</td>
                  <td className="py-3">
                    <span className="label-tech border border-border px-1.5 py-0.5">{order.status}</span>
                  </td>
                  <td className="py-3 text-right text-[13.5px] font-semibold tabular-nums">{money(order.subtotal)}</td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant="ghost" asChild><Link href={`/orders/${order.id}`}>Open</Link></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
