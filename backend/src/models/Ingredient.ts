import { Schema, model, type Model } from 'mongoose';
import { UNITS, type Unit } from '../types/enums.js';

export interface IIngredient {
  name: string;
  sku: string;
  unit: Unit;
  currentStock: number;
  reorderLevel: number;
  costPerUnit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    unit: { type: String, enum: UNITS, required: true },
    currentStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    costPerUnit: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

ingredientSchema.index({ currentStock: 1, reorderLevel: 1 });
ingredientSchema.index({ name: 'text' });

ingredientSchema.virtual('isLowStock').get(function (this: IIngredient) {
  return this.currentStock <= this.reorderLevel;
});

export const Ingredient = model<IIngredient, Model<IIngredient>>('Ingredient', ingredientSchema);
