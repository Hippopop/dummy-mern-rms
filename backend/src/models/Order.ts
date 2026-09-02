import { Schema, model, type Model, type Types, type HydratedDocument } from 'mongoose';
import { ORDER_ITEM_STATUSES, ORDER_STATUSES, type OrderItemStatus, type OrderStatus } from '../types/enums.js';
import { round2 } from '../utils/helpers.js';

export interface IOrderItem {
  _id?: Types.ObjectId;
  menuItem: Types.ObjectId;
  name: string;
  unitPrice: number;
  quantity: number;
  notes: string;
  status: OrderItemStatus;
  readyAt: Date | null;
}

export interface IOrder {
  orderNumber: string;
  table: Types.ObjectId;
  customer: Types.ObjectId;
  waiter: Types.ObjectId | null;
  guestCount: number;
  items: IOrderItem[];
  status: OrderStatus;
  bill: Types.ObjectId | null;
  placedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderMethods {
  subtotal(): number;
  deriveStatus(): OrderStatus;
}

type OrderModel = Model<IOrder, {}, IOrderMethods>;
export type OrderDocument = HydratedDocument<IOrder, IOrderMethods>;

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String, default: '', maxlength: 200 },
    status: { type: String, enum: ORDER_ITEM_STATUSES, default: 'queued' },
    readyAt: { type: Date, default: null },
  },
  { _id: true },
);

const orderSchema = new Schema<IOrder, OrderModel, IOrderMethods>(
  {
    orderNumber: { type: String, required: true, unique: true, uppercase: true },
    table: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    waiter: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    guestCount: { type: Number, default: 1, min: 1 },
    items: { type: [orderItemSchema], default: [] },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed' },
    bill: { type: Schema.Types.ObjectId, ref: 'Bill', default: null },
    placedAt: { type: Date, default: () => new Date() },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ table: 1, status: 1 });
orderSchema.index({ waiter: 1, createdAt: -1 });

orderSchema.methods.subtotal = function (this: OrderDocument): number {
  return round2(this.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
};

orderSchema.methods.deriveStatus = function (this: OrderDocument): OrderStatus {
  if (this.status === 'completed' || this.status === 'cancelled') return this.status;
  if (this.items.length === 0) return 'placed';
  if (this.items.every((i) => i.status === 'served')) return 'served';
  if (this.items.every((i) => i.status === 'ready' || i.status === 'served')) return 'ready';
  if (this.items.some((i) => i.status !== 'queued')) return 'preparing';
  return 'placed';
};

export const Order = model<IOrder, OrderModel>('Order', orderSchema);
