'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { useAction, useCategories, useIngredients, useMenu } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { money, qty } from '@/lib/format';
import type { MenuItem } from '@/lib/types';

const UNITS = ['kg', 'g', 'l', 'ml', 'pcs'];

export default function MenuPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('name');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);

  const { can } = useAuth();
  const { data: categories } = useCategories();
  const { data: items, isLoading } = useMenu({
    search, category: category === 'all' ? undefined : category, sort,
  });

  const editable = can('menu', 'write');

  return (
    <>
      <PageHeader
        description={`${items?.length ?? 0} dishes · prices and the ingredients each one needs`}
        action={editable ? <Button size="sm" onClick={() => setCreating(true)}>Add dish</Button> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2.5">
        <Input placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.itemCount})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price-asc">Price: low to high</SelectItem>
            <SelectItem value="price-desc">Price: high to low</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : items?.length === 0 ? (
        <Panel className="py-16 text-center"><span className="label-tech">No dishes match.</span></Panel>
      ) : (
        <Panel className="px-4 py-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="label-tech py-2.5 text-left">Dish</th>
                <th className="label-tech py-2.5 text-left">Category</th>
                <th className="label-tech py-2.5 text-left">Kitchen status</th>
                <th className="label-tech py-2.5 text-right">Price</th>
                {editable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 align-top">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium">{item.name}</span>
                      {!item.isAvailable ? <span className="label-tech border border-border px-1.5 py-0.5">Off menu</span> : null}
                    </div>
                    {item.description ? (
                      <p className="mt-0.5 max-w-md text-[12px] text-muted-foreground">{item.description}</p>
                    ) : null}
                    {item.shortages.length > 0 ? (
                      <p className="mt-1 text-[12px] text-destructive">
                        Short: {item.shortages.map((s) => `${s.name} (${qty(s.available)}/${qty(s.required)}${s.unit})`).join(', ')}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3 text-[13px] text-muted-foreground">{item.category?.name}</td>
                  <td className="py-3">
                    {item.canCook ? (
                      <span className="label-tech flex items-center gap-1.5 text-primary">
                        <span className="size-1.5 bg-primary" />
                        {item.maxPortions === null ? 'No recipe' : `${item.maxPortions} portions`}
                      </span>
                    ) : (
                      <span className="label-tech flex items-center gap-1.5 text-destructive">
                        <AlertTriangle className="size-3" /> Cannot cook
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <span className="figure inline-block border border-border px-2 py-1 text-[14px]">{money(item.price)}</span>
                  </td>
                  {editable ? (
                    <td className="py-3 pl-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>Edit</Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {editing ? <EditDialog item={editing} onClose={() => setEditing(null)} /> : null}
      {creating ? <CreateDialog onClose={() => setCreating(false)} /> : null}
    </>
  );
}

function EditDialog({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [price, setPrice] = useState(String(item.price));
  const [name, setName] = useState(item.name);
  const [available, setAvailable] = useState(item.isAvailable);

  const update = useAction('patch', `/menu/${item.id}`, { invalidate: ['menu'], success: 'Dish updated' });
  const remove = useAction('delete', `/menu/${item.id}`, { invalidate: ['menu'], success: 'Dish removed' });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle className="display text-lg">Edit {item.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="label-tech">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price" className="label-tech">Price</Label>
            <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            Available on the menu
          </label>
          {item.recipe.length > 0 ? (
            <div className="border border-border p-3 text-xs">
              <p className="label-tech mb-1.5">Ingredients</p>
              {item.recipe.map((line, i) => (
                <p key={i} className="text-muted-foreground">
                  {qty(line.quantity)}{line.unit} {line.ingredient?.name} — {qty(line.ingredient?.currentStock ?? 0)}{line.ingredient?.unit} in stock
                </p>
              ))}
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={() => remove.mutate(undefined, { onSuccess: onClose })}>Remove</Button>
          <Button
            disabled={update.isPending}
            onClick={() => update.mutate({ name, price: Number(price), isAvailable: available }, { onSuccess: onClose })}
          >Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const { data: categories } = useCategories();
  const { data: ingredients } = useIngredients();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [recipe, setRecipe] = useState<{ ingredient: string; quantity: string; unit: string }[]>([]);

  const create = useAction('post', '/menu', { invalidate: ['menu', 'categories'], success: 'Dish added' });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="display text-lg">Add a dish</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cname" className="label-tech">Name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cdesc" className="label-tech">Description</Label>
            <Textarea id="cdesc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cprice" className="label-tech">Price</Label>
              <Input id="cprice" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="label-tech">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="label-tech">Ingredients</Label>
              <Button type="button" size="sm" variant="outline"
                onClick={() => setRecipe([...recipe, { ingredient: '', quantity: '', unit: 'g' }])}>Add line</Button>
            </div>
            {recipe.map((line, index) => (
              <div key={index} className="flex gap-2">
                <Select value={line.ingredient}
                  onValueChange={(v) => setRecipe(recipe.map((l, i) => i === index ? { ...l, ingredient: v } : l))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Ingredient" /></SelectTrigger>
                  <SelectContent>
                    {ingredients?.map((ing) => <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="w-20" type="number" placeholder="Qty" value={line.quantity}
                  onChange={(e) => setRecipe(recipe.map((l, i) => i === index ? { ...l, quantity: e.target.value } : l))} />
                <Select value={line.unit}
                  onValueChange={(v) => setRecipe(recipe.map((l, i) => i === index ? { ...l, unit: v } : l))}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" size="sm" variant="ghost"
                  onClick={() => setRecipe(recipe.filter((_, i) => i !== index))}>×</Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name || !price || !category || create.isPending}
            onClick={() => create.mutate({
              name, description, price: Number(price), category,
              recipe: recipe.filter((l) => l.ingredient && l.quantity)
                .map((l) => ({ ingredient: l.ingredient, quantity: Number(l.quantity), unit: l.unit })),
            }, { onSuccess: onClose })}
          >Add dish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
