'use client';

import { use, useState } from 'react';
import { PageHeader } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { useAction, useBill } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
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

  if (isLoading || !bill) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader title={bill.billNumber}
        description={bill.status === 'paid' ? `Paid ${dateTime(bill.paidAt)} by ${bill.paymentMethod}` : 'Awaiting payment'} />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Panel className="px-5 py-5">
          <div className="space-y-4">
            <div className="border-b border-border pb-4 text-center">
              <p className="display text-[20px] leading-none">{bill.restaurant?.name}</p>
              <p className="mt-1.5 text-[12px] text-muted-foreground">{bill.restaurant?.address}</p>
              <p className="text-[12px] tabular-nums text-muted-foreground">{bill.restaurant?.phone}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-border pb-4">
              <Field label="Bill" value={bill.billNumber} />
              <Field label="Order" value={bill.order?.orderNumber ?? '—'} />
              <Field label="Customer" value={bill.customerName} />
              <Field label="Phone" value={bill.customerPhone} />
            </div>

            <div className="space-y-1.5">
              {bill.order?.items?.map((item) => (
                <div key={item._id} className="flex justify-between text-[13.5px]">
                  <span><span className="figure mr-1.5">{item.quantity}×</span>{item.name}</span>
                  <span className="tabular-nums">{money(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              <Row label="Subtotal" value={money(bill.subtotal)} />
              <Row label={`Tax (${bill.taxPercent}%)`} value={money(bill.taxAmount)} muted />
              <Row label={`Service charge (${bill.serviceChargePercent}%)`} value={money(bill.serviceChargeAmount)} muted />
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="label-tech">Total</span>
                <span className="figure text-[26px] leading-none">{money(bill.total)}</span>
              </div>
            </div>

            <p className="label-tech pt-1 text-center">{bill.restaurant?.invoiceFooter}</p>
          </div>
        </Panel>

        <Panel className="h-fit px-4 py-4 print:hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="label-tech">Status</span>
              <span className={bill.status === 'paid'
                ? 'label-tech border border-border px-1.5 py-0.5 text-muted-foreground'
                : 'label-tech border border-primary px-1.5 py-0.5 text-primary'}>{bill.status}</span>
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
                <p className="text-[12px] text-muted-foreground">Paying completes the order and frees the table.</p>
              </>
            ) : null}

            <Button variant="outline" className="w-full" onClick={() => window.print()}>Print</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-tech">{label}</p>
      <p className="text-[13.5px]">{value}</p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={muted ? 'flex justify-between text-[13px] text-muted-foreground' : 'flex justify-between text-[13.5px]'}>
      <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}
