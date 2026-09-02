import type { Request, Response } from 'express';
import { z } from 'zod';
import { Category, Ingredient, MenuItem } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { areCompatible, created, escapeRegex, ok, param, toSlug } from '../utils/helpers.js';
import { checkIngredients } from '../services/kitchen.service.js';
import { UNITS } from '../types/enums.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(''),
  category: objectId,
  price: z.coerce.number().min(0).max(1_000_000),
  prepTimeMinutes: z.coerce.number().int().min(0).max(240).optional().default(10),
  recipe: z.array(z.object({
    ingredient: objectId,
    quantity: z.coerce.number().positive(),
    unit: z.enum(UNITS),
  })).optional().default([]),
});

export const updateMenuItemSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  category: objectId.optional(),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  prepTimeMinutes: z.coerce.number().int().min(0).max(240).optional(),
  isAvailable: z.boolean().optional(),
  recipe: z.array(z.object({
    ingredient: objectId,
    quantity: z.coerce.number().positive(),
    unit: z.enum(UNITS),
  })).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

async function validateRecipe(recipe: { ingredient: string; quantity: number; unit: string }[]): Promise<void> {
  if (recipe.length === 0) return;
  const ingredients = await Ingredient.find({ _id: { $in: recipe.map((r) => r.ingredient) } })
    .select('name unit isActive').lean();
  const byId = new Map(ingredients.map((i) => [String(i._id), i]));

  const problems: { field: string; message: string }[] = [];
  recipe.forEach((line, index) => {
    const ing = byId.get(line.ingredient);
    if (!ing) { problems.push({ field: `recipe.${index}.ingredient`, message: 'Ingredient does not exist' }); return; }
    if (!areCompatible(line.unit as never, ing.unit)) {
      problems.push({
        field: `recipe.${index}.unit`,
        message: `Recipe uses ${line.unit} but "${ing.name}" is stocked in ${ing.unit}`,
      });
    }
  });
  if (problems.length > 0) throw ApiError.badRequest('Recipe is not valid', 'INVALID_RECIPE', problems);
}

export async function listCategories(_req: Request, res: Response): Promise<Response> {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  const counts = await MenuItem.aggregate<{ _id: unknown; count: number }>([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.count]));
  return ok(res, 'Categories fetched', categories.map((c) => ({
    ...c, id: String(c._id), itemCount: byId.get(String(c._id)) ?? 0,
  })));
}

export async function createCategory(req: Request, res: Response): Promise<Response> {
  const body = req.body as z.infer<typeof categorySchema>;
  if (await Category.exists({ name: body.name })) {
    throw ApiError.conflict(`A category named "${body.name}" already exists`, 'DUPLICATE_KEY');
  }
  const last = await Category.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
  const category = await Category.create({ ...body, sortOrder: body.sortOrder ?? (last?.sortOrder ?? -1) + 1 });
  return created(res, 'Category created', { ...category.toObject(), id: String(category._id) });
}

export async function updateCategory(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  const body = req.body as z.infer<typeof categorySchema>;
  if (body.name && body.name !== category.name) {
    category.name = body.name;
    category.slug = toSlug(body.name);
  }
  if (body.sortOrder !== undefined) category.sortOrder = body.sortOrder;
  await category.save();
  return ok(res, 'Category updated', { ...category.toObject(), id });
}

export async function deleteCategory(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  const items = await MenuItem.countDocuments({ category: id, isActive: true });
  if (items > 0) {
    throw ApiError.conflict(`"${category.name}" still holds ${items} menu items`, 'CATEGORY_IN_USE');
  }
  category.isActive = false;
  await category.save();
  return ok(res, 'Category removed', null);
}

export async function listMenu(req: Request, res: Response): Promise<Response> {
  const { search, category, sort } = req.query as { search?: string; category?: string; sort?: string };

  const filter: Record<string, unknown> = { isActive: true };
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    name: { name: 1 },
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    newest: { createdAt: -1 },
  };

  const items = await MenuItem.find(filter)
    .populate({ path: 'category', select: 'name slug' })
    .populate({ path: 'recipe.ingredient', select: 'name unit currentStock' })
    .sort(sortMap[sort ?? 'name'] ?? { sortOrder: 1, name: 1 })
    .lean();

  const withAvailability = await Promise.all(items.map(async (item) => {
    const availability = await checkIngredients(item.recipe as never);
    return {
      ...item,
      id: String(item._id),
      canCook: item.isAvailable && availability.canCook,
      maxPortions: availability.maxPortions,
      shortages: availability.shortages,
    };
  }));

  return ok(res, 'Menu fetched', withAvailability);
}

export async function createMenuItem(req: Request, res: Response): Promise<Response> {
  const body = req.body as z.infer<typeof createMenuItemSchema>;
  if (!(await Category.exists({ _id: body.category }))) {
    throw ApiError.badRequest('That category does not exist', 'CATEGORY_NOT_FOUND');
  }
  if (await MenuItem.exists({ name: body.name })) {
    throw ApiError.conflict(`A menu item named "${body.name}" already exists`, 'DUPLICATE_KEY');
  }
  await validateRecipe(body.recipe);
  const item = await MenuItem.create(body);
  return created(res, 'Menu item created', { ...item.toObject(), id: String(item._id) });
}

export async function updateMenuItem(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const body = req.body as z.infer<typeof updateMenuItemSchema>;
  const item = await MenuItem.findById(id);
  if (!item) throw ApiError.notFound('Menu item not found', 'MENU_ITEM_NOT_FOUND');

  if (body.category && !(await Category.exists({ _id: body.category }))) {
    throw ApiError.badRequest('That category does not exist', 'CATEGORY_NOT_FOUND');
  }
  if (body.recipe) await validateRecipe(body.recipe);
  if (body.name && body.name !== item.name) {
    item.name = body.name;
    item.slug = toSlug(body.name);
  }

  const { name: _n, ...rest } = body;
  Object.assign(item, rest);
  await item.save();
  return ok(res, 'Menu item updated', { ...item.toObject(), id });
}

export async function deleteMenuItem(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const item = await MenuItem.findById(id);
  if (!item) throw ApiError.notFound('Menu item not found', 'MENU_ITEM_NOT_FOUND');
  item.isActive = false;
  item.isAvailable = false;
  await item.save();
  return ok(res, `"${item.name}" removed from the menu`, null);
}
