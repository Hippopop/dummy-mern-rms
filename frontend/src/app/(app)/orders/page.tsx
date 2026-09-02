'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/app-shell';
import { useOrders } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { money, time } from '@/lib/format';

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const { can } = useAuth();

  return (
    <>
      <PageHeader title="Orders" description="Orders currently open on the floor"
        action={can('orders', 'write') ? <Button asChild><Link href="/orders/new">Take an order</Link></Button> : undefined} />

      {isLoading ? <Skeleton className="h-64" /> : orders?.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No open orders.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead><TableHead>Table</TableHead><TableHead>Customer</TableHead>
                  <TableHead>Waiter</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                      <span className="block text-xs text-muted-foreground">{time(order.placedAt)}</span>
                    </TableCell>
                    <TableCell>{order.table?.label}</TableCell>
                    <TableCell>
                      {order.customer?.name}
                      <span className="block text-xs text-muted-foreground">{order.customer?.phone}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{order.waiter?.name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{order.status}</Badge></TableCell>
                    <TableCell className="text-right">{money(order.subtotal)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" asChild><Link href={`/orders/${order.id}`}>Open</Link></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
