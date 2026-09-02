import { Schema, model, type Model } from 'mongoose';
import { toSlug } from '../utils/helpers.js';

export interface ICategory {
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function () {
  if (!this.slug && this.name) this.slug = toSlug(this.name);
});

categorySchema.index({ sortOrder: 1, name: 1 });

export const Category = model<ICategory, Model<ICategory>>('Category', categorySchema);
