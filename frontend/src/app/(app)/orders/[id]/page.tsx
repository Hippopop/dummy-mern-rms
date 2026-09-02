'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/app-shell';
import { Panel, PanelHeader } from '@/components/panel';
import { useAction, useCategories, useMenu, useOrder, useStaff } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
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

  if (isLoading || !order) return <Skeleton className="h-64" />;

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
                <Button size="sm" variant="outline" onClick={() => setAdding(true)}>Add items</Button>
                <Button size="sm" variant="outline" onClick={() => setAssigning(true)}>Assign waiter</Button>
              </>
            ) : null}
            {can('bills', 'write') && !order.bill && !closed ? (
              <Button size="sm" onClick={() => makeBill.mutate(undefined, {
                onSuccess: (bill) => router.push(`/bills/${bill.id}`),
              })}>Generate bill</Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel>
          <PanelHeader title="Items" aside={`${order.items.length} lines`} />
          <div className="px-4 pb-4">
            {order.items.map((item) => (
              <div key={item._id} className="flex items-center justify-between gap-3 border-b border-border py-3">
                <div>
                  <p className="text-[13.5px]">
                    <span className="figure mr-1.5 text-[15px]">{item.quantity}×</span>
                    <span className="font-medium">{item.name}</span>
                  </p>
                  {item.notes ? <p className="mt-0.5 text-[12px] text-muted-foreground">{item.notes}</p> : null}
                  <span className="label-tech mt-1.5 inline-block border border-border px-1.5 py-0.5">{item.status}</span>
                </div>
                <span className="text-[13.5px] tabular-nums">{money(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between pt-3">
              <span className="label-tech">Subtotal</span>
              <span className="figure text-[20px]">{money(order.subtotal)}</span>
            </div>
          </div>
        </Panel>

        <Panel className="h-fit">
          <PanelHeader title="Details" />
          <div className="space-y-3.5 px-4 pb-4">
            <div>
              <p className="label-tech">Customer</p>
              <p className="text-[13.5px]">{order.customer?.name}</p>
              <p className="text-[12px] tabular-nums text-muted-foreground">{order.customer?.phone}</p>
            </div>
            <div>
              <p className="label-tech">Waiter</p>
              <p className="text-[13.5px]">{order.waiter?.name ?? 'Unassigned'}</p>
            </div>
            <div>
              <p className="label-tech">Status</p>
              <span className="label-tech mt-1 inline-block border border-border px-1.5 py-0.5 text-foreground">{order.status}</span>
            </div>
            {can('orders', 'write') && !closed ? (
              <Button variant="destructive" size="sm" className="w-full"
                onClick={() => cancel.mutate(undefined, { onSuccess: () => router.push('/orders') })}>
                Cancel order
              </Button>
            ) : null}
          </div>
        </Panel>
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
        <DialogHeader><DialogTitle className="display text-lg">Add items</DialogTitle></DialogHeader>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="space-y-2">
          {menu?.filter((m) => m.canCook).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 border-b border-border pb-2">
              <div><p className="text-[13.5px]">{item.name}</p><p className="text-[12px] tabular-nums text-muted-foreground">{money(item.price)}</p></div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline"
                  onClick={() => setPicked({ ...picked, [item.id]: Math.max(0, (picked[item.id] ?? 0) - 1) })}>-</Button>
                <span className="figure w-6 text-center text-[14px]">{picked[item.id] ?? 0}</span>
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
        <DialogHeader><DialogTitle className="display text-lg">Assign a waiter</DialogTitle></DialogHeader>
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
