export const ROLES = ['admin', 'manager', 'waiter', 'chef'] as const;
export type Role = (typeof ROLES)[number];

export const RESOURCES = ['users', 'menu', 'inventory', 'kitchen', 'tables', 'orders', 'bills', 'dashboard'] as const;
export type Resource = (typeof RESOURCES)[number];

export type Access = 'none' | 'read' | 'write';

// Edit this table to change what each role can do.
// read = may view, write = may view and change.
export const ROLE_ACCESS: Record<Role, Record<Resource, Access>> = {
  admin: {
    users: 'write', menu: 'write', inventory: 'write', kitchen: 'write',
    tables: 'write', orders: 'write', bills: 'write', dashboard: 'read',
  },
  manager: {
    users: 'write', menu: 'write', inventory: 'write', kitchen: 'write',
    tables: 'write', orders: 'write', bills: 'write', dashboard: 'read',
  },
  waiter: {
    users: 'none', menu: 'read', inventory: 'read', kitchen: 'read',
    tables: 'write', orders: 'write', bills: 'write', dashboard: 'read',
  },
  chef: {
    users: 'none', menu: 'read', inventory: 'write', kitchen: 'write',
    tables: 'none', orders: 'read', bills: 'none', dashboard: 'none',
  },
};

export function can(role: Role, resource: Resource, level: 'read' | 'write'): boolean {
  const granted = ROLE_ACCESS[role][resource];
  if (granted === 'write') return true;
  return granted === 'read' && level === 'read';
}
