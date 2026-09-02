'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { Panel, PanelHeader } from '@/components/panel';
import { useAction, useCategories, useMenu, useTables } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
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
      <PageHeader description="Pick a table, note the guest's details, then add dishes" />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Table and guest" aside="Step 01" />
            <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="label-tech">Table</Label>
                <Select value={table} onValueChange={setTable}>
                  <SelectTrigger><SelectValue placeholder={free.length ? 'Pick a free table' : 'No free tables'} /></SelectTrigger>
                  <SelectContent>
                    {free.map((t) => <SelectItem key={t.id} value={t.id}>{t.label} · {t.capacity} seats</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guests" className="label-tech">Guests</Label>
                <Input id="guests" type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
                {seats > 0 && Number(guestCount) > seats ? (
                  <p className="text-[12px] text-destructive">That table seats {seats}.</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cname" className="label-tech">Customer name</Label>
                <Input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cphone" className="label-tech">Phone</Label>
                <Input id="cphone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+8801711223344" />
                <p className="text-[12px] text-muted-foreground">A new customer record is created if this number is unknown.</p>
              </div>
            </div>
          </Panel>

          <div className="flex flex-wrap gap-2.5">
            <Input placeholder="Search the menu…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {menu?.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!item.canCook}
                onClick={() => addLine({ id: item.id, name: item.name, price: item.price })}
                className="border border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border disabled:hover:bg-transparent"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13.5px] font-medium">{item.name}</span>
                  <span className="figure shrink-0 text-[14px]">{money(item.price)}</span>
                </div>
                {!item.canCook ? (
                  <span className="label-tech mt-1.5 inline-block text-destructive">
                    {item.isAvailable ? 'Out of ingredients' : 'Off menu'}
                  </span>
                ) : item.maxPortions !== null ? (
                  <span className="label-tech mt-1.5 inline-block">{item.maxPortions} left</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <Panel className="h-fit lg:sticky lg:top-6">
          <PanelHeader title="Order" aside={lines.length ? `${lines.length} lines` : undefined} />
          <div className="space-y-3 px-4 pb-4">
            {lines.length === 0 ? (
              <p className="py-4 text-[13px] text-muted-foreground">Tap a dish to add it.</p>
            ) : lines.map((line) => (
              <div key={line.menuItem} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px]">{line.name}</p>
                  <p className="text-[12px] tabular-nums text-muted-foreground">{money(line.price)} each</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="outline" className="size-7"
                    onClick={() => changeQuantity(line.menuItem, -1)}><Minus className="size-3" /></Button>
                  <span className="figure w-6 text-center text-[14px]">{line.quantity}</span>
                  <Button size="icon" variant="outline" className="size-7"
                    onClick={() => changeQuantity(line.menuItem, 1)}><Plus className="size-3" /></Button>
                </div>
              </div>
            ))}

            {lines.length > 0 ? (
              <>
                <div className="flex items-baseline justify-between border-t border-border pt-3">
                  <span className="label-tech">Subtotal</span>
                  <span className="figure text-[20px]">{money(subtotal)}</span>
                </div>
                <p className="text-[12px] text-muted-foreground">Tax and service charge are added on the bill.</p>
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
          </div>
        </Panel>
      </div>
    </>
  );
}
