'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/app-shell';
import { useAction, useTables } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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

  return (
    <>
      <PageHeader
        title="Tables"
        description="Floor status. Seat guests from the Orders screen."
        action={can('tables', 'write') ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>Add table</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a table</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="T-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Seats</Label>
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
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tables?.map((table) => (
            <Card key={table.id} className={table.status === 'occupied' ? 'border-primary' : ''}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{table.label}</span>
                  <Badge variant={table.status === 'occupied' ? 'default' : 'secondary'}>{table.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{table.capacity} seats</p>
                {table.status === 'occupied' ? (
                  <div className="space-y-1 text-xs">
                    <p>{table.guestCount} guests · since {time(table.occupiedAt)}</p>
                    {table.assignedWaiter ? <p className="text-muted-foreground">Waiter: {table.assignedWaiter.name}</p> : null}
                    {table.currentOrder ? (
                      <Link href={`/orders/${table.currentOrder._id}`} className="text-primary underline">
                        {table.currentOrder.orderNumber}
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Free</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
