'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/app-shell';
import { useAction, useCategories, useMenu, useOrder, useStaff } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { money, dateTime } from '@/lib/format';
import type { Bill } from '@/lib/types';

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: order, isLoading } = useOrder(id);
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const makeBill = useAction<undefined, Bill>('post', `/orders/${id}/bill`, {
    invalidate: ['orders', 'bills', 'order'], success: (b) => `${b.billNumber} generated`,
  });
  const cancel = useAction('post', `/orders/${id}/cancel`, {
    invalidate: ['orders', 'tables', 'kitchen'], success: 'Order cancelled',
  });

  if (isLoading || !order) return <><PageHeader title="Order" /><Skeleton className="h-64" /></>;

  const closed = order.status === 'completed' || order.status === 'cancelled';

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`Table ${order.table?.label} · ${order.guestCount} guests · placed ${dateTime(order.placedAt)}`}
        action={
          <div className="flex gap-2">
            {can('orders', 'write') && !closed ? (
              <>
                <Button variant="outline" onClick={() => setAdding(true)}>Add items</Button>
                <Button variant="outline" onClick={() => setAssigning(true)}>Assign waiter</Button>
              </>
            ) : null}
            {can('bills', 'write') && !order.bill && !closed ? (
              <Button onClick={() => makeBill.mutate(undefined, {
                onSuccess: (bill) => router.push(`/bills/${bill.id}`),
              })}>Generate bill</Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item._id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.quantity} × {item.name}</p>
                  {item.notes ? <p className="text-xs text-muted-foreground">{item.notes}</p> : null}
                  <Badge variant="outline" className="mt-1 text-xs capitalize">{item.status}</Badge>
                </div>
                <span className="text-sm">{money(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-medium">
              <span>Subtotal</span><span>{money(order.subtotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><p className="text-muted-foreground">Customer</p><p>{order.customer?.name}</p>
              <p className="text-xs text-muted-foreground">{order.customer?.phone}</p></div>
            <div><p className="text-muted-foreground">Waiter</p><p>{order.waiter?.name ?? 'Unassigned'}</p></div>
            <div><p className="text-muted-foreground">Status</p>
              <Badge variant="outline" className="capitalize">{order.status}</Badge></div>
            {can('orders', 'write') && !closed ? (
              <Button variant="destructive" size="sm" className="w-full"
                onClick={() => cancel.mutate(undefined, { onSuccess: () => router.push('/orders') })}>
                Cancel order
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {adding ? <AddItemsDialog orderId={id} onClose={() => setAdding(false)} /> : null}
      {assigning ? <AssignDialog orderId={id} onClose={() => setAssigning(false)} /> : null}
    </>
  );
}

function AddItemsDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [category, setCategory] = useState('all');
  const [picked, setPicked] = useState<Record<string, number>>({});
  const { data: categories } = useCategories();
  const { data: menu } = useMenu({ category: category === 'all' ? undefined : category });

  const add = useAction('post', `/orders/${orderId}/items`, {
    invalidate: ['order', 'orders', 'kitchen'], success: 'Items added',
  });

  const items = Object.entries(picked).filter(([, q]) => q > 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add items</DialogTitle></DialogHeader>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="space-y-2">
          {menu?.filter((m) => m.canCook).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 border-b pb-2">
              <div><p className="text-sm">{item.name}</p><p className="text-xs text-muted-foreground">{money(item.price)}</p></div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline"
                  onClick={() => setPicked({ ...picked, [item.id]: Math.max(0, (picked[item.id] ?? 0) - 1) })}>-</Button>
                <span className="w-6 text-center text-sm">{picked[item.id] ?? 0}</span>
                <Button size="sm" variant="outline"
                  onClick={() => setPicked({ ...picked, [item.id]: (picked[item.id] ?? 0) + 1 })}>+</Button>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button disabled={items.length === 0 || add.isPending}
            onClick={() => add.mutate({
              items: items.map(([menuItem, quantity]) => ({ menuItem, quantity })),
            }, { onSuccess: onClose })}>Add {items.length ? `(${items.length})` : ''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data: staff } = useStaff();
  const [waiter, setWaiter] = useState('');
  const assign = useAction('patch', `/orders/${orderId}/waiter`, {
    invalidate: ['order', 'orders', 'tables'], success: 'Waiter assigned',
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign a waiter</DialogTitle></DialogHeader>
        <Select value={waiter} onValueChange={setWaiter}>
          <SelectTrigger><SelectValue placeholder="Pick someone" /></SelectTrigger>
          <SelectContent>
            {staff?.filter((s) => s.isActive).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button disabled={!waiter || assign.isPending}
            onClick={() => assign.mutate({ waiter }, { onSuccess: onClose })}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
