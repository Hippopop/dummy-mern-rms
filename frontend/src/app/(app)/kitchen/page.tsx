'use client';

import { PageHeader } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { useAction, useKitchenQueue } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
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

  if (isLoading) return <Skeleton className="h-48" />;

  const tickets = data?.tickets ?? [];

  return (
    <>
      <PageHeader description={`${data?.pendingItems ?? 0} items to cook · starting a dish deducts its ingredients`} />

      {tickets.length === 0 ? (
        <Panel className="py-16 text-center"><span className="label-tech">Queue is clear.</span></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => {
            const late = ticket.waitingMinutes > 20;
            return (
              <Panel key={ticket.orderId} className={cn(late && 'border-destructive')}>
                <div className="flex items-start justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="display text-[19px] leading-none">Table {ticket.table}</p>
                    <p className="label-tech mt-1.5">{ticket.orderNumber}</p>
                  </div>
                  <span className={cn('figure text-[22px] leading-none', late ? 'text-destructive' : 'text-primary')}>
                    {ticket.waitingMinutes}
                    <span className="label-tech ml-1">min</span>
                  </span>
                </div>

                <div className="px-4 py-1">
                  {ticket.items.map((item) => (
                    <div key={item.itemId} className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
                      <div className="min-w-0">
                        <p className="text-[13.5px]">
                          <span className="figure mr-1.5 text-[15px]">{item.quantity}×</span>
                          <span className="font-medium">{item.name}</span>
                        </p>
                        {item.notes ? <p className="mt-0.5 text-[12px] text-muted-foreground">{item.notes}</p> : null}
                        <span className="label-tech mt-1.5 inline-block border border-border px-1.5 py-0.5">{item.status}</span>
                      </div>
                      {can('kitchen', 'write') ? (
                        <Button
                          size="sm"
                          variant={item.status === 'ready' ? 'outline' : 'default'}
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
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
