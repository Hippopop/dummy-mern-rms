import { Schema, model, type Model, type Types } from 'mongoose';
import { TABLE_STATUSES, type TableStatus } from '../types/enums.js';

export interface ITable {
  label: string;
  capacity: number;
  status: TableStatus;
  currentOrder: Types.ObjectId | null;
  assignedWaiter: Types.ObjectId | null;
  guestCount: number;
  occupiedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
  {
    label: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
    capacity: { type: Number, required: true, min: 1, max: 50 },
    status: { type: String, enum: TABLE_STATUSES, default: 'available' },
    currentOrder: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    assignedWaiter: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    guestCount: { type: Number, default: 0, min: 0 },
    occupiedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

tableSchema.index({ status: 1 });

export const Table = model<ITable, Model<ITable>>('Table', tableSchema);
