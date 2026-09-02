'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { useBills } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { dateTime, money } from '@/lib/format';

export default function BillsPage() {
  const [status, setStatus] = useState('all');
  const { data: bills, isLoading } = useBills(status === 'all' ? undefined : status);

  return (
    <>
      <PageHeader description="Generated cheques and payments" />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="mb-4 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? <Skeleton className="h-64" /> : bills?.length === 0 ? (
        <Panel className="py-16 text-center"><span className="label-tech">No bills yet.</span></Panel>
      ) : (
        <Panel className="px-4 py-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="label-tech py-2.5 text-left">Bill</th>
                <th className="label-tech py-2.5 text-left">Customer</th>
                <th className="label-tech py-2.5 text-left">Order</th>
                <th className="label-tech py-2.5 text-left">Status</th>
                <th className="label-tech py-2.5 text-right">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bills?.map((bill) => (
                <tr key={bill.id} className="border-b border-border last:border-0">
                  <td className="py-3">
                    <span className="text-[13.5px] font-medium">{bill.billNumber}</span>
                    <span className="block text-[11.5px] tabular-nums text-muted-foreground">{dateTime(bill.createdAt)}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-[13.5px]">{bill.customerName}</span>
                    <span className="block text-[11.5px] tabular-nums text-muted-foreground">{bill.customerPhone}</span>
                  </td>
                  <td className="py-3 text-[13px] text-muted-foreground">{bill.order?.orderNumber}</td>
                  <td className="py-3">
                    <span className={cn('label-tech border px-1.5 py-0.5',
                      bill.status === 'paid' ? 'border-border text-muted-foreground' : 'border-primary text-primary')}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3 text-right text-[13.5px] font-semibold tabular-nums">{money(bill.total)}</td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant="ghost" asChild><Link href={`/bills/${bill.id}`}>Open</Link></Button>
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
