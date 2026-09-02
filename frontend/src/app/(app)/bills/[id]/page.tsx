'use client';

import { use, useState } from 'react';
import { PageHeader } from '@/components/app-shell';
import { useAction, useBill } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { dateTime, money } from '@/lib/format';

const METHODS = ['cash', 'card', 'mobile-banking'];

export default function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: bill, isLoading } = useBill(id);
  const { can } = useAuth();
  const [method, setMethod] = useState('cash');

  const pay = useAction('post', `/bills/${id}/pay`, {
    invalidate: ['bill', 'bills', 'orders', 'tables', 'dashboard'],
    success: 'Paid — the table is now free',
  });

  if (isLoading || !bill) return <><PageHeader title="Bill" /><Skeleton className="h-96" /></>;

  return (
    <>
      <PageHeader title={bill.billNumber}
        description={bill.status === 'paid' ? `Paid ${dateTime(bill.paidAt)} by ${bill.paymentMethod}` : 'Awaiting payment'} />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="print:shadow-none">
          <CardContent className="space-y-4 pt-6">
            <div className="text-center">
              <p className="font-semibold">{bill.restaurant?.name}</p>
              <p className="text-xs text-muted-foreground">{bill.restaurant?.address}</p>
              <p className="text-xs text-muted-foreground">{bill.restaurant?.phone}</p>
            </div>

            <div className="border-y py-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Bill</span><span>{bill.billNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span>{bill.order?.orderNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{bill.customerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{bill.customerPhone}</span></div>
            </div>

            <div className="space-y-1 text-sm">
              {bill.order?.items?.map((item) => (
                <div key={item._id} className="flex justify-between">
                  <span>{item.quantity} × {item.name}</span>
                  <span>{money(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(bill.subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({bill.taxPercent}%)</span><span>{money(bill.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Service charge ({bill.serviceChargePercent}%)</span><span>{money(bill.serviceChargeAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span><span>{money(bill.total)}</span>
              </div>
            </div>

            <p className="pt-2 text-center text-xs text-muted-foreground">{bill.restaurant?.invoiceFooter}</p>
          </CardContent>
        </Card>

        <Card className="h-fit print:hidden">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={bill.status === 'paid' ? 'secondary' : 'default'}>{bill.status}</Badge>
            </div>

            {bill.status === 'unpaid' && can('bills', 'write') ? (
              <>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button className="w-full" disabled={pay.isPending}
                  onClick={() => pay.mutate({ paymentMethod: method })}>
                  {pay.isPending ? 'Processing…' : `Take payment · ${money(bill.total)}`}
                </Button>
                <p className="text-xs text-muted-foreground">Paying completes the order and frees the table.</p>
              </>
            ) : null}

            <Button variant="outline" className="w-full" onClick={() => window.print()}>Print</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
