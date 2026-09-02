import { Schema, model, type Model } from 'mongoose';

export interface ICustomer {
  name: string;
  phone: string;
  visitCount: number;
  totalSpend: number;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
    visitCount: { type: Number, default: 0, min: 0 },
    totalSpend: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const Customer = model<ICustomer, Model<ICustomer>>('Customer', customerSchema);
