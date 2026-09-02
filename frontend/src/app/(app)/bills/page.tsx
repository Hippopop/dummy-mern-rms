'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/app-shell';
import { useBills } from '@/hooks/use-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dateTime, money } from '@/lib/format';

export default function BillsPage() {
  const [status, setStatus] = useState('all');
  const { data: bills, isLoading } = useBills(status === 'all' ? undefined : status);

  return (
    <>
      <PageHeader title="Bills" description="Generated cheques and payments" />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="mb-4 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? <Skeleton className="h-64" /> : bills?.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No bills yet.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead><TableHead>Customer</TableHead><TableHead>Order</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills?.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">
                      {bill.billNumber}
                      <span className="block text-xs text-muted-foreground">{dateTime(bill.createdAt)}</span>
                    </TableCell>
                    <TableCell>{bill.customerName}
                      <span className="block text-xs text-muted-foreground">{bill.customerPhone}</span></TableCell>
                    <TableCell className="text-muted-foreground">{bill.order?.orderNumber}</TableCell>
                    <TableCell>
                      <Badge variant={bill.status === 'paid' ? 'secondary' : 'default'}>{bill.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{money(bill.total)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" asChild><Link href={`/bills/${bill.id}`}>Open</Link></Button>
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
