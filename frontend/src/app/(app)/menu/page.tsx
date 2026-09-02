'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { useAction, useCategories, useIngredients, useMenu } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { money } from '@/lib/format';
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
        title="Menu"
        description="Dishes, prices and the ingredients each one needs"
        action={editable ? <Button onClick={() => setCreating(true)}>Add dish</Button> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-3">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : items?.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No dishes match.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map((item) => (
            <Card key={item.id} className={!item.canCook ? 'opacity-70' : ''}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category?.name}</p>
                  </div>
                  <span className="shrink-0 font-semibold">{money(item.price)}</span>
                </div>

                {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}

                <div className="flex flex-wrap gap-1">
                  {!item.isAvailable ? <Badge variant="secondary">Off menu</Badge> : null}
                  {item.canCook
                    ? <Badge variant="outline">{item.maxPortions === null ? 'No recipe' : `${item.maxPortions} portions left`}</Badge>
                    : <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" /> Cannot cook</Badge>}
                </div>

                {item.shortages.length > 0 ? (
                  <p className="text-xs text-destructive">
                    Short: {item.shortages.map((s) => `${s.name} (${s.available}/${s.required}${s.unit})`).join(', ')}
                  </p>
                ) : null}

                {editable ? (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setEditing(item)}>Edit</Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
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
        <DialogHeader><DialogTitle>Edit {item.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            Available on the menu
          </label>
          {item.recipe.length > 0 ? (
            <div className="rounded-md bg-muted/50 p-3 text-xs">
              <p className="mb-1 font-medium">Ingredients</p>
              {item.recipe.map((line, i) => (
                <p key={i} className="text-muted-foreground">
                  {line.quantity}{line.unit} {line.ingredient?.name} — {line.ingredient?.currentStock}{line.ingredient?.unit} in stock
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
        <DialogHeader><DialogTitle>Add a dish</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cdesc">Description</Label>
            <Textarea id="cdesc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cprice">Price</Label>
              <Input id="cprice" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
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
              <Label>Ingredients</Label>
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
