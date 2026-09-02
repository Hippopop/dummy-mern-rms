import { Schema, model, type Model, type Types } from 'mongoose';
import { BILL_STATUSES, PAYMENT_METHODS, type BillStatus, type PaymentMethod } from '../types/enums.js';

export interface IBill {
  billNumber: string;
  order: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  total: number;
  status: BillStatus;
  paymentMethod: PaymentMethod | null;
  issuedBy: Types.ObjectId;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const billSchema = new Schema<IBill>(
  {
    billNumber: { type: String, required: true, unique: true, uppercase: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    subtotal: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    serviceChargePercent: { type: Number, required: true, min: 0 },
    serviceChargeAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: BILL_STATUSES, default: 'unpaid' },
    paymentMethod: { type: String, enum: [...PAYMENT_METHODS, null], default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

billSchema.index({ status: 1, createdAt: -1 });

export const Bill = model<IBill, Model<IBill>>('Bill', billSchema);
