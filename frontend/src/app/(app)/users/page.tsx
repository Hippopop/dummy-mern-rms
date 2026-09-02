'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { useAction, useStaff } from '@/hooks/use-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
      <PageHeader title="Staff" description="Create accounts and manage access"
        action={<Button onClick={() => setCreating(true)}>Add staff</Button>} />

      {isLoading ? <Skeleton className="h-64" /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Email</TableHead>
                  <TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff?.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell className="text-muted-foreground">{person.email}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{person.role}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={person.isActive ? 'secondary' : 'destructive'}>
                        {person.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost"
                        onClick={() => setStatus.mutate({ id: person.id, isActive: !person.isActive })}>
                        {person.isActive ? 'Suspend' : 'Reactivate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {creating ? <CreateDialog onClose={() => setCreating(false)} onCreated={setIssued} /> : null}

      {issued ? (
        <Dialog open onOpenChange={() => setIssued(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Account created</DialogTitle></DialogHeader>
            <p className="text-sm">
              Give <strong>{issued.name}</strong> this temporary password. It is shown once and they
              must change it on first sign-in.
            </p>
            <div className="flex items-center gap-2 rounded-md bg-muted p-3">
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
        <DialogHeader><DialogTitle>Add a staff member</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Role</Label>
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
