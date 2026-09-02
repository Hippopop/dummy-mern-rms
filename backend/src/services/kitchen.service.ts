import { Ingredient, MenuItem, type IRecipeLine } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { areCompatible, convert, roundQty } from '../utils/helpers.js';
import type { Unit } from '../types/enums.js';

export interface Shortage {
  ingredient: string;
  name: string;
  required: number;
  available: number;
  unit: Unit;
}

export interface Availability {
  canCook: boolean;
  maxPortions: number | null;
  shortages: Shortage[];
}

export async function checkIngredients(recipe: IRecipeLine[], portions = 1): Promise<Availability> {
  if (recipe.length === 0) return { canCook: true, maxPortions: null, shortages: [] };

  const ingredients = await Ingredient.find({ _id: { $in: recipe.map((r) => r.ingredient) } })
    .select('name unit currentStock').lean();
  const byId = new Map(ingredients.map((i) => [String(i._id), i]));

  const shortages: Shortage[] = [];
  let maxPortions = Number.POSITIVE_INFINITY;

  for (const line of recipe) {
    const ing = byId.get(String(line.ingredient));
    if (!ing || !areCompatible(line.unit, ing.unit)) {
      shortages.push({
        ingredient: String(line.ingredient), name: ing?.name ?? '(missing ingredient)',
        required: line.quantity, available: 0, unit: line.unit,
      });
      maxPortions = 0;
      continue;
    }
    const perPortion = convert(line.quantity, line.unit, ing.unit);
    const required = roundQty(perPortion * portions);
    if (perPortion > 0) maxPortions = Math.min(maxPortions, Math.floor(ing.currentStock / perPortion));
    if (ing.currentStock < required) {
      shortages.push({
        ingredient: String(ing._id), name: ing.name,
        required, available: ing.currentStock, unit: ing.unit,
      });
    }
  }

  return {
    canCook: shortages.length === 0,
    maxPortions: Number.isFinite(maxPortions) ? Math.max(0, maxPortions) : null,
    shortages,
  };
}

export async function consumeIngredients(menuItemId: string, portions: number): Promise<void> {
  const item = await MenuItem.findById(menuItemId).select('name recipe').lean();
  if (!item) throw ApiError.notFound('Menu item not found', 'MENU_ITEM_NOT_FOUND');

  const availability = await checkIngredients(item.recipe, portions);
  if (!availability.canCook) {
    throw ApiError.unprocessable(
      `Not enough ingredients for "${item.name}": ${availability.shortages
        .map((s) => `${s.name} (need ${s.required}${s.unit}, have ${s.available}${s.unit})`).join('; ')}`,
      'INSUFFICIENT_INGREDIENTS',
    );
  }

  const ingredients = await Ingredient.find({ _id: { $in: item.recipe.map((r) => r.ingredient) } })
    .select('unit').lean();
  const unitById = new Map(ingredients.map((i) => [String(i._id), i.unit]));

  await Promise.all(item.recipe.map((line) => {
    const unit = unitById.get(String(line.ingredient))!;
    const amount = convert(line.quantity, line.unit, unit) * portions;
    return Ingredient.updateOne({ _id: line.ingredient }, { $inc: { currentStock: -roundQty(amount) } });
  }));
}
