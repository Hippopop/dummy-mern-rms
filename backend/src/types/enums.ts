export const UNITS = ['kg', 'g', 'l', 'ml', 'pcs'] as const;
export type Unit = (typeof UNITS)[number];

export const TABLE_STATUSES = ['available', 'occupied'] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export const ORDER_STATUSES = ['placed', 'preparing', 'ready', 'served', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ITEM_STATUSES = ['queued', 'preparing', 'ready', 'served'] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

export const BILL_STATUSES = ['unpaid', 'paid'] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const PAYMENT_METHODS = ['cash', 'card', 'mobile-banking'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
