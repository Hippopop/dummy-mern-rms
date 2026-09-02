export type Role = 'admin' | 'manager' | 'waiter' | 'chef';
export type Access = 'none' | 'read' | 'write';
export type Resource = 'users' | 'menu' | 'inventory' | 'kitchen' | 'tables' | 'orders' | 'bills' | 'dashboard';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  access: Record<Resource, Access>;
  mustChangePassword: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  itemCount: number;
}

export interface Shortage {
  ingredient: string;
  name: string;
  required: number;
  available: number;
  unit: string;
}

export interface MenuItem {
  id: string;
  _id: string;
  name: string;
  description: string;
  price: number;
  prepTimeMinutes: number;
  isAvailable: boolean;
  category: { _id?: string; id?: string; name: string; slug: string };
  recipe: { ingredient: { _id: string; name: string; unit: string; currentStock: number }; quantity: number; unit: string }[];
  canCook: boolean;
  maxPortions: number | null;
  shortages: Shortage[];
}

export interface Ingredient {
  id: string;
  _id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  costPerUnit: number;
  isLowStock: boolean;
}

export interface RestaurantTable {
  id: string;
  _id: string;
  label: string;
  capacity: number;
  status: 'available' | 'occupied';
  guestCount: number;
  occupiedAt: string | null;
  assignedWaiter: { _id: string; name: string } | null;
  currentOrder: { _id: string; orderNumber: string; status: string } | null;
}

export interface OrderItem {
  _id: string;
  menuItem: string;
  name: string;
  unitPrice: number;
  quantity: number;
  notes: string;
  status: 'queued' | 'preparing' | 'ready' | 'served';
}

export interface Order {
  id: string;
  _id: string;
  orderNumber: string;
  status: string;
  guestCount: number;
  subtotal: number;
  placedAt: string;
  bill: string | null;
  items: OrderItem[];
  table: { _id: string; label: string; capacity?: number };
  customer: { _id: string; name: string; phone: string };
  waiter: { _id: string; name: string } | null;
}

export interface KitchenTicket {
  orderId: string;
  orderNumber: string;
  table: string;
  placedAt: string;
  waitingMinutes: number;
  // The backend filters served lines out of the queue, so they can never appear here.
  items: { itemId: string; name: string; quantity: number; notes: string; status: Exclude<OrderItem['status'], 'served'> }[];
}

export interface Bill {
  id: string;
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  total: number;
  status: 'unpaid' | 'paid';
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  order?: { _id: string; orderNumber: string; items?: OrderItem[]; guestCount?: number };
  issuedBy?: { name: string };
  restaurant?: { name: string; address: string; phone: string; currencySymbol: string; invoiceFooter: string };
}

export interface StaffUser {
  id: string;
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
}

export interface Dashboard {
  revenueToday: number;
  billsToday: number;
  popularItems: { name: string; quantity: number; revenue: number }[];
  tables: { available: number; occupied: number; total: number };
  activeOrders: number;
  lowStockCount: number;
  recentBills: { id: string; billNumber: string; customerName: string; total: number; paidAt: string }[];
}
