import type { Request, Response } from 'express';
import { z } from 'zod';
import { Ingredient, MenuItem } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { created, escapeRegex, ok, param, roundQty } from '../utils/helpers.js';
import { UNITS } from '../types/enums.js';

export const createIngredientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/, 'Letters, numbers, dot, underscore and hyphen only'),
  unit: z.enum(UNITS),
  currentStock: z.coerce.number().min(0).optional().default(0),
  reorderLevel: z.coerce.number().min(0).optional().default(0),
  costPerUnit: z.coerce.number().min(0).optional().default(0),
});

export const updateIngredientSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  costPerUnit: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export const restockSchema = z.object({
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
});

export async function listIngredients(req: Request, res: Response): Promise<Response> {
  const { search, lowStock } = req.query as { search?: string; lowStock?: string };
  const filter: Record<string, unknown> = { isActive: true };
  if (search) filter.name = new RegExp(escapeRegex(search), 'i');
  if (lowStock === 'true') filter.$expr = { $lte: ['$currentStock', '$reorderLevel'] };

  const items = await Ingredient.find(filter).sort({ name: 1 }).lean();
  return ok(res, 'Ingredients fetched', items.map((i) => ({
    ...i, id: String(i._id), isLowStock: i.currentStock <= i.reorderLevel,
  })));
}

export async function createIngredient(req: Request, res: Response): Promise<Response> {
  const body = req.body as z.infer<typeof createIngredientSchema>;
  const sku = body.sku.toUpperCase();
  if (await Ingredient.exists({ sku })) {
    throw ApiError.conflict(`An ingredient with SKU "${sku}" already exists`, 'DUPLICATE_KEY');
  }
  const ingredient = await Ingredient.create({ ...body, sku });
  return created(res, 'Ingredient created', { ...ingredient.toObject(), id: String(ingredient._id) });
}

export async function updateIngredient(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) throw ApiError.notFound('Ingredient not found', 'INGREDIENT_NOT_FOUND');

  Object.assign(ingredient, req.body);
  await ingredient.save();
  return ok(res, 'Ingredient updated', { ...ingredient.toObject(), id });
}

export async function restockIngredient(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const { quantity } = req.body as { quantity: number };

  const ingredient = await Ingredient.findByIdAndUpdate(
    id,
    { $inc: { currentStock: roundQty(quantity) } },
    { returnDocument: 'after' },
  );
  if (!ingredient) throw ApiError.notFound('Ingredient not found', 'INGREDIENT_NOT_FOUND');

  return ok(res, `Restocked ${quantity} ${ingredient.unit} of "${ingredient.name}"`, {
    id, name: ingredient.name, currentStock: ingredient.currentStock, unit: ingredient.unit,
  });
}

export async function deleteIngredient(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) throw ApiError.notFound('Ingredient not found', 'INGREDIENT_NOT_FOUND');

  const usedIn = await MenuItem.find({ 'recipe.ingredient': id, isActive: true }).select('name').lean();
  if (usedIn.length > 0) {
    throw ApiError.conflict(
      `"${ingredient.name}" is used by ${usedIn.map((m) => m.name).join(', ')}. Remove it from those recipes first.`,
      'INGREDIENT_IN_USE',
    );
  }

  ingredient.isActive = false;
  await ingredient.save();
  return ok(res, `"${ingredient.name}" removed`, null);
}
