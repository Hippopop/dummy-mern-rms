import { Schema, model, type Model, type Types } from 'mongoose';
import { UNITS, type Unit } from '../types/enums.js';
import { toSlug } from '../utils/helpers.js';

export interface IRecipeLine {
  ingredient: Types.ObjectId;
  quantity: number;
  unit: Unit;
}

export interface IMenuItem {
  name: string;
  slug: string;
  description: string;
  category: Types.ObjectId;
  price: number;
  prepTimeMinutes: number;
  isAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  recipe: IRecipeLine[];
  createdAt: Date;
  updatedAt: Date;
}

const recipeLineSchema = new Schema<IRecipeLine>(
  {
    ingredient: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: UNITS, required: true },
  },
  { _id: false },
);

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0 },
    prepTimeMinutes: { type: Number, default: 10, min: 0 },
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    recipe: { type: [recipeLineSchema], default: [] },
  },
  { timestamps: true },
);

menuItemSchema.pre('validate', function () {
  if (!this.slug && this.name) this.slug = toSlug(this.name);
});

menuItemSchema.index({ category: 1, isActive: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text' });

export const MenuItem = model<IMenuItem, Model<IMenuItem>>('MenuItem', menuItemSchema);
