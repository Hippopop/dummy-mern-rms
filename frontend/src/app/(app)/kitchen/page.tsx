'use client';

import { PageHeader } from '@/components/app-shell';
import { useAction, useKitchenQueue } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const NEXT_STATUS = { queued: 'preparing', preparing: 'ready', ready: 'served' } as const;
const LABEL = { queued: 'Start cooking', preparing: 'Mark ready', ready: 'Mark served' } as const;

export default function KitchenPage() {
  const { data, isLoading } = useKitchenQueue();
  const { can } = useAuth();

  const setStatus = useAction<{ orderId: string; itemId: string; status: string }>(
    'patch',
    (body) => `/kitchen/orders/${body.orderId}/items/${body.itemId}`,
    { invalidate: ['kitchen', 'orders', 'tables', 'ingredients'] },
  );

  if (isLoading) return <><PageHeader title="Kitchen" /><Skeleton className="h-48" /></>;

  const tickets = data?.tickets ?? [];

  return (
    <>
      <PageHeader
        title="Kitchen"
        description={`${data?.pendingItems ?? 0} items still to cook. Starting a dish deducts its ingredients.`}
      />

      {tickets.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nothing in the queue.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => (
            <Card key={ticket.orderId} className={cn(ticket.waitingMinutes > 20 && 'border-destructive')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Table {ticket.table}</span>
                  <Badge variant={ticket.waitingMinutes > 20 ? 'destructive' : 'secondary'}>
                    {ticket.waitingMinutes} min
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{ticket.orderNumber}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.items.map((item) => (
                  <div key={item.itemId} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.quantity} × {item.name}</p>
                      {item.notes ? <p className="text-xs text-muted-foreground">{item.notes}</p> : null}
                      <Badge variant="outline" className="mt-1 text-xs capitalize">{item.status}</Badge>
                    </div>
                    {can('kitchen', 'write') ? (
                      <Button
                        size="sm"
                        variant={item.status === 'ready' ? 'secondary' : 'default'}
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({
                          orderId: ticket.orderId, itemId: item.itemId, status: NEXT_STATUS[item.status],
                        })}
                      >
                        {LABEL[item.status]}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
