'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/app-shell';
import { Panel, Label as Tech } from '@/components/panel';
import { useAction, useTables } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { time } from '@/lib/format';

export default function TablesPage() {
  const { data: tables, isLoading } = useTables();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState('4');

  const createTable = useAction<{ label: string; capacity: number }>('post', '/tables', {
    invalidate: ['tables'], success: 'Table added',
  });

  const occupied = tables?.filter((t) => t.status === 'occupied').length ?? 0;
  const seats = tables?.reduce((sum, t) => sum + t.capacity, 0) ?? 0;

  return (
    <>
      <PageHeader
        description={`${occupied} of ${tables?.length ?? 0} tables occupied · ${seats} seats on the floor`}
        action={can('tables', 'write') ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm">Add table</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="display text-lg">Add a table</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label" className="label-tech">Label</Label>
                  <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="T-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="label-tech">Seats</Label>
                  <Input id="capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!label || createTable.isPending}
                  onClick={() => createTable.mutate({ label, capacity: Number(capacity) }, {
                    onSuccess: () => { setOpen(false); setLabel(''); },
                  })}
                >Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : undefined}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tables?.map((table) => {
            const busy = table.status === 'occupied';
            return (
              <Panel key={table.id} className={cn('px-4 py-3.5', busy && 'border-primary bg-accent/40')}>
                <div className="flex items-start justify-between">
                  <span className="display text-[24px] leading-none">{table.label}</span>
                  <span className={cn('label-tech flex items-center gap-1.5', busy ? 'text-primary' : '')}>
                    <span className={cn('size-1.5', busy ? 'bg-primary' : 'bg-muted-foreground')} />
                    {busy ? 'Seated' : 'Open'}
                  </span>
                </div>
                <p className="label-tech mt-2">{table.capacity} seats</p>

                {busy ? (
                  <div className="mt-3 space-y-1 border-t border-border pt-2.5 text-[12.5px]">
                    <p className="tabular-nums">{table.guestCount} guests · since {time(table.occupiedAt)}</p>
                    {table.assignedWaiter ? <p className="text-muted-foreground">{table.assignedWaiter.name}</p> : null}
                    {table.currentOrder ? (
                      <Link href={`/orders/${table.currentOrder._id}`} className="inline-block font-medium text-primary hover:underline">
                        {table.currentOrder.orderNumber} →
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 border-t border-border pt-2.5 text-[12.5px] text-muted-foreground">
                    Ready to seat
                  </p>
                )}
              </Panel>
            );
          })}
        </div>
      )}
      {!isLoading && !tables?.length ? <Tech>No tables configured yet.</Tech> : null}
    </>
  );
}
