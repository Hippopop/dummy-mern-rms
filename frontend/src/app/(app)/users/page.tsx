'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { cn } from '@/lib/utils';
import { useAction, useStaff } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const ROLES = ['admin', 'manager', 'waiter', 'chef'];

export default function UsersPage() {
  const { data: staff, isLoading } = useStaff();
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);

  const setStatus = useAction<{ id: string; isActive: boolean }>(
    'patch', (b) => `/users/${b.id}`, { invalidate: ['users'], success: 'Staff updated' },
  );

  return (
    <>
      <PageHeader description={`${staff?.length ?? 0} staff accounts`}
        action={<Button size="sm" onClick={() => setCreating(true)}>Add staff</Button>} />

      {isLoading ? <Skeleton className="h-64" /> : (
        <Panel className="px-4 py-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="label-tech py-2.5 text-left">Name</th>
                <th className="label-tech py-2.5 text-left">Email</th>
                <th className="label-tech py-2.5 text-left">Role</th>
                <th className="label-tech py-2.5 text-left">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {staff?.map((person) => (
                <tr key={person.id} className="border-b border-border last:border-0">
                  <td className="py-3">
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center border border-border text-[10.5px] font-semibold">
                        {person.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <span className="text-[13.5px] font-medium">{person.name}</span>
                    </span>
                  </td>
                  <td className="py-3 text-[13px] text-muted-foreground">{person.email}</td>
                  <td className="py-3"><span className="label-tech border border-border px-1.5 py-0.5">{person.role}</span></td>
                  <td className="py-3">
                    <span className={cn('label-tech flex items-center gap-1.5',
                      person.isActive ? 'text-primary' : 'text-destructive')}>
                      <span className={cn('size-1.5', person.isActive ? 'bg-primary' : 'bg-destructive')} />
                      {person.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant="ghost"
                      onClick={() => setStatus.mutate({ id: person.id, isActive: !person.isActive })}>
                      {person.isActive ? 'Suspend' : 'Reactivate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {creating ? <CreateDialog onClose={() => setCreating(false)} onCreated={setIssued} /> : null}

      {issued ? (
        <Dialog open onOpenChange={() => setIssued(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="display text-lg">Account created</DialogTitle></DialogHeader>
            <p className="text-sm">
              Give <strong>{issued.name}</strong> this temporary password. It is shown once and they
              must change it on first sign-in.
            </p>
            <div className="flex items-center gap-2 border border-border bg-muted p-3">
              <code className="flex-1 font-mono text-sm">{issued.password}</code>
              <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(issued.password)}>
                <Copy className="size-4" />
              </Button>
            </div>
            <DialogFooter><Button onClick={() => setIssued(null)}>Done</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function CreateDialog({ onClose, onCreated }: {
  onClose: () => void; onCreated: (v: { name: string; password: string }) => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'waiter' });
  const create = useAction<typeof form, { user: { name: string }; temporaryPassword: string }>(
    'post', '/users', { invalidate: ['users'] },
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle className="display text-lg">Add a staff member</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label className="label-tech">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label className="label-tech">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label className="label-tech">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-2">
            <Label className="label-tech">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!form.name || !form.email || create.isPending}
            onClick={() => create.mutate(form, {
              onSuccess: (result) => {
                onClose();
                onCreated({ name: result.user.name, password: result.temporaryPassword });
              },
            })}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
