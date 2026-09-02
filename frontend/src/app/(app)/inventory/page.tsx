'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/app-shell';
import { useAction, useIngredients } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { money } from '@/lib/format';
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
        title="Inventory"
        description={lowCount > 0 ? `${lowCount} ingredients need restocking` : 'All ingredients above their reorder level'}
        action={editable ? <Button onClick={() => setCreating(true)}>Add ingredient</Button> : undefined}
      />

      <Input placeholder="Search ingredients…" value={search} onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-xs" />

      {isLoading ? <Skeleton className="h-64" /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead className="text-right">Reorder at</TableHead>
                  <TableHead className="text-right">Cost / unit</TableHead>
                  {editable ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients?.map((ing) => (
                  <TableRow key={ing.id}>
                    <TableCell className="font-medium">
                      {ing.name}
                      {ing.isLowStock ? <Badge variant="destructive" className="ml-2">Low</Badge> : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ing.sku}</TableCell>
                    <TableCell className="text-right">{ing.currentStock} {ing.unit}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{ing.reorderLevel} {ing.unit}</TableCell>
                    <TableCell className="text-right">{money(ing.costPerUnit)}</TableCell>
                    {editable ? (
                      <TableCell className="space-x-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => setRestocking(ing)}>Restock</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(ing)}>Edit</Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
        <DialogHeader><DialogTitle>Restock {ingredient.name}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="qty">Quantity to add ({ingredient.unit})</Label>
          <Input id="qty" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Currently {ingredient.currentStock} {ingredient.unit} in stock.
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
        <DialogHeader><DialogTitle>Edit {ingredient.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="iname">Name</Label>
            <Input id="iname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reorder">Reorder level ({ingredient.unit})</Label>
              <Input id="reorder" type="number" min={0} step="any" value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost per {ingredient.unit}</Label>
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
        <DialogHeader><DialogTitle>Add an ingredient</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={set('name')} /></div>
            <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={set('sku')} placeholder="ING-SALT" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Opening stock</Label>
              <Input type="number" min={0} step="any" value={form.currentStock} onChange={set('currentStock')} /></div>
            <div className="space-y-2"><Label>Reorder at</Label>
              <Input type="number" min={0} step="any" value={form.reorderLevel} onChange={set('reorderLevel')} /></div>
          </div>
          <div className="space-y-2"><Label>Cost per unit</Label>
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
