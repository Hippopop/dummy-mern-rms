'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { useAction, useCategories, useMenu, useTables } from '@/hooks/use-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { money } from '@/lib/format';
import type { Order } from '@/lib/types';

interface Line { menuItem: string; name: string; price: number; quantity: number }

export default function NewOrderPage() {
  const router = useRouter();
  const [table, setTable] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [lines, setLines] = useState<Line[]>([]);

  const { data: tables } = useTables();
  const { data: categories } = useCategories();
  const { data: menu } = useMenu({ search, category: category === 'all' ? undefined : category });

  const create = useAction<Record<string, unknown>, Order>('post', '/orders', {
    invalidate: ['orders', 'tables', 'kitchen', 'dashboard', 'menu'],
    success: (order) => `${order.orderNumber} placed`,
  });

  const free = tables?.filter((t) => t.status === 'available') ?? [];
  const seats = free.find((t) => t.id === table)?.capacity ?? 0;
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  function addLine(item: { id: string; name: string; price: number }) {
    setLines((current) => {
      const existing = current.find((l) => l.menuItem === item.id);
      if (existing) return current.map((l) => l.menuItem === item.id ? { ...l, quantity: l.quantity + 1 } : l);
      return [...current, { menuItem: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function changeQuantity(menuItem: string, delta: number) {
    setLines((current) => current
      .map((l) => l.menuItem === menuItem ? { ...l, quantity: l.quantity + delta } : l)
      .filter((l) => l.quantity > 0));
  }

  const ready = table && customerName.length >= 2 && customerPhone.length >= 4 && lines.length > 0;

  return (
    <>
      <PageHeader title="Take an order" description="Pick a table, note the guest's details, then add dishes" />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Table and guest</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Table</Label>
                <Select value={table} onValueChange={setTable}>
                  <SelectTrigger><SelectValue placeholder={free.length ? 'Pick a free table' : 'No free tables'} /></SelectTrigger>
                  <SelectContent>
                    {free.map((t) => <SelectItem key={t.id} value={t.id}>{t.label} · {t.capacity} seats</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guests">Guests</Label>
                <Input id="guests" type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
                {seats > 0 && Number(guestCount) > seats ? (
                  <p className="text-xs text-destructive">That table seats {seats}.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cname">Customer name</Label>
                <Input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cphone">Phone</Label>
                <Input id="cphone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+8801711223344" />
                <p className="text-xs text-muted-foreground">A new customer record is created if this number is unknown.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Input placeholder="Search the menu…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {menu?.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!item.canCook}
                onClick={() => addLine({ id: item.id, name: item.name, price: item.price })}
                className="rounded-lg border p-3 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="shrink-0 text-sm">{money(item.price)}</span>
                </div>
                {!item.canCook ? (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    {item.isAvailable ? 'Out of ingredients' : 'Off menu'}
                  </Badge>
                ) : item.maxPortions !== null ? (
                  <p className="mt-1 text-xs text-muted-foreground">{item.maxPortions} left</p>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader><CardTitle className="text-base">Order</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tap a dish to add it.</p>
            ) : lines.map((line) => (
              <div key={line.menuItem} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{line.name}</p>
                  <p className="text-xs text-muted-foreground">{money(line.price)} each</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="outline" className="size-7"
                    onClick={() => changeQuantity(line.menuItem, -1)}><Minus className="size-3" /></Button>
                  <span className="w-6 text-center text-sm">{line.quantity}</span>
                  <Button size="icon" variant="outline" className="size-7"
                    onClick={() => changeQuantity(line.menuItem, 1)}><Plus className="size-3" /></Button>
                </div>
              </div>
            ))}

            {lines.length > 0 ? (
              <>
                <div className="flex justify-between border-t pt-3 text-sm font-medium">
                  <span>Subtotal</span><span>{money(subtotal)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Tax and service charge are added on the bill.</p>
              </>
            ) : null}

            <Button
              className="w-full"
              disabled={!ready || create.isPending}
              onClick={() => create.mutate({
                table, guestCount: Number(guestCount), customerName, customerPhone,
                items: lines.map((l) => ({ menuItem: l.menuItem, quantity: l.quantity })),
              }, { onSuccess: (order) => router.push(`/orders/${order.id}`) })}
            >
              {create.isPending ? 'Placing…' : 'Place order'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
