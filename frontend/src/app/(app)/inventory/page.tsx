'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { useAction, useIngredients } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { money, qty } from '@/lib/format';
import type { Ingredient } from '@/lib/types';

const UNITS = ['kg', 'g', 'l', 'ml', 'pcs'];

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [restocking, setRestocking] = useState<Ingredient | null>(null);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [creating, setCreating] = useState(false);

  const { can } = useAuth();
  const { data: ingredients, isLoading } = useIngredients(search);
  const editable = can('inventory', 'write');
  const lowCount = ingredients?.filter((i) => i.isLowStock).length ?? 0;

  return (
    <>
      <PageHeader
        description={lowCount > 0 ? `${lowCount} ingredients below their reorder level` : 'All ingredients above their reorder level'}
        action={editable ? <Button size="sm" onClick={() => setCreating(true)}>Add ingredient</Button> : undefined}
      />

      <Input placeholder="Search ingredients…" value={search} onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-xs" />

      {isLoading ? <Skeleton className="h-64" /> : (
        <Panel className="px-4 py-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="label-tech py-2.5 text-left">Ingredient</th>
                <th className="label-tech py-2.5 text-left">SKU</th>
                <th className="label-tech py-2.5 text-left">Level</th>
                <th className="label-tech py-2.5 text-right">In stock</th>
                <th className="label-tech py-2.5 text-right">Reorder at</th>
                <th className="label-tech py-2.5 text-right">Cost / unit</th>
                {editable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {ingredients?.map((ing) => {
                // Bar reads full at twice the reorder level, so "at par" sits halfway.
                const fill = Math.min(100, (ing.currentStock / Math.max(ing.reorderLevel * 2, 0.001)) * 100);
                return (
                  <tr key={ing.id} className="border-b border-border last:border-0">
                    <td className="py-3">
                      <span className="text-[13.5px] font-medium">{ing.name}</span>
                      {ing.isLowStock ? (
                        <span className="label-tech ml-2 border border-destructive px-1.5 py-0.5 text-destructive">Low</span>
                      ) : null}
                    </td>
                    <td className="py-3 text-[12.5px] tabular-nums text-muted-foreground">{ing.sku}</td>
                    <td className="w-32 py-3">
                      <div className="h-1.5 w-28 bg-data-track">
                        <div className={ing.isLowStock ? 'h-1.5 bg-destructive' : 'h-1.5 bg-data-strong'}
                          style={{ width: `${Math.max(2, fill)}%` }} />
                      </div>
                    </td>
                    <td className="py-3 text-right text-[13.5px] font-medium tabular-nums">{qty(ing.currentStock)} {ing.unit}</td>
                    <td className="py-3 text-right text-[13px] tabular-nums text-muted-foreground">{qty(ing.reorderLevel)} {ing.unit}</td>
                    <td className="py-3 text-right text-[13.5px] tabular-nums">{money(ing.costPerUnit)}</td>
                    {editable ? (
                      <td className="space-x-1 py-3 pl-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setRestocking(ing)}>Restock</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(ing)}>Edit</Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {restocking ? <RestockDialog ingredient={restocking} onClose={() => setRestocking(null)} /> : null}
      {editing ? <EditDialog ingredient={editing} onClose={() => setEditing(null)} /> : null}
      {creating ? <CreateDialog onClose={() => setCreating(false)} /> : null}
    </>
  );
}

function RestockDialog({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const [quantity, setQuantity] = useState('');
  const restock = useAction('post', `/ingredients/${ingredient.id}/restock`, {
    invalidate: ['ingredients', 'menu', 'dashboard'], success: 'Stock added',
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle className="display text-lg">Restock {ingredient.name}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="qty" className="label-tech">Quantity to add ({ingredient.unit})</Label>
          <Input id="qty" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Currently {qty(ingredient.currentStock)} {ingredient.unit} in stock.
          </p>
        </div>
        <DialogFooter>
          <Button disabled={!quantity || restock.isPending}
            onClick={() => restock.mutate({ quantity: Number(quantity) }, { onSuccess: onClose })}>Restock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const [name, setName] = useState(ingredient.name);
  const [reorderLevel, setReorderLevel] = useState(String(ingredient.reorderLevel));
  const [costPerUnit, setCostPerUnit] = useState(String(ingredient.costPerUnit));

  const update = useAction('patch', `/ingredients/${ingredient.id}`, { invalidate: ['ingredients'], success: 'Ingredient updated' });
  const remove = useAction('delete', `/ingredients/${ingredient.id}`, { invalidate: ['ingredients'], success: 'Ingredient removed' });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle className="display text-lg">Edit {ingredient.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="iname" className="label-tech">Name</Label>
            <Input id="iname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reorder" className="label-tech">Reorder level ({ingredient.unit})</Label>
              <Input id="reorder" type="number" min={0} step="any" value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost" className="label-tech">Cost per {ingredient.unit}</Label>
              <Input id="cost" type="number" min={0} step="any" value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={() => remove.mutate(undefined, { onSuccess: onClose })}>Remove</Button>
          <Button disabled={update.isPending}
            onClick={() => update.mutate({
              name, reorderLevel: Number(reorderLevel), costPerUnit: Number(costPerUnit),
            }, { onSuccess: onClose })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', sku: '', unit: 'kg', currentStock: '', reorderLevel: '', costPerUnit: '' });
  const create = useAction('post', '/ingredients', { invalidate: ['ingredients'], success: 'Ingredient added' });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle className="display text-lg">Add an ingredient</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label className="label-tech">Name</Label><Input value={form.name} onChange={set('name')} /></div>
            <div className="space-y-2"><Label className="label-tech">SKU</Label><Input value={form.sku} onChange={set('sku')} placeholder="ING-SALT" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="label-tech">Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="label-tech">Opening stock</Label>
              <Input type="number" min={0} step="any" value={form.currentStock} onChange={set('currentStock')} /></div>
            <div className="space-y-2"><Label className="label-tech">Reorder at</Label>
              <Input type="number" min={0} step="any" value={form.reorderLevel} onChange={set('reorderLevel')} /></div>
          </div>
          <div className="space-y-2"><Label className="label-tech">Cost per unit</Label>
            <Input type="number" min={0} step="any" value={form.costPerUnit} onChange={set('costPerUnit')} /></div>
        </div>
        <DialogFooter>
          <Button disabled={!form.name || !form.sku || create.isPending}
            onClick={() => create.mutate({
              name: form.name, sku: form.sku, unit: form.unit,
              currentStock: Number(form.currentStock || 0),
              reorderLevel: Number(form.reorderLevel || 0),
              costPerUnit: Number(form.costPerUnit || 0),
            }, { onSuccess: onClose })}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
