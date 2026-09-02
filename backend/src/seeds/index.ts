import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Category, Ingredient, MenuItem, Table, User } from '../models/index.js';
import { toSlug } from '../utils/helpers.js';
import type { Unit } from '../types/enums.js';

const INGREDIENTS: { name: string; sku: string; unit: Unit; stock: number; reorder: number; cost: number }[] = [
  { name: 'Basmati Rice', sku: 'ING-RICE', unit: 'kg', stock: 80, reorder: 25, cost: 145 },
  { name: 'Chicken', sku: 'ING-CHICKEN', unit: 'kg', stock: 35, reorder: 12, cost: 210 },
  { name: 'Beef', sku: 'ING-BEEF', unit: 'kg', stock: 20, reorder: 8, cost: 780 },
  { name: 'Prawn', sku: 'ING-PRAWN', unit: 'kg', stock: 9, reorder: 4, cost: 950 },
  { name: 'Rohu Fish', sku: 'ING-FISH', unit: 'kg', stock: 14, reorder: 5, cost: 420 },
  { name: 'Onion', sku: 'ING-ONION', unit: 'kg', stock: 40, reorder: 10, cost: 55 },
  { name: 'Tomato', sku: 'ING-TOMATO', unit: 'kg', stock: 25, reorder: 8, cost: 70 },
  { name: 'Potato', sku: 'ING-POTATO', unit: 'kg', stock: 50, reorder: 15, cost: 35 },
  { name: 'Green Chilli', sku: 'ING-CHILLI', unit: 'kg', stock: 4, reorder: 2, cost: 160 },
  { name: 'Coriander Leaf', sku: 'ING-CORIANDER', unit: 'kg', stock: 2, reorder: 3, cost: 120 },
  { name: 'Plain Flour', sku: 'ING-FLOUR', unit: 'kg', stock: 45, reorder: 15, cost: 65 },
  { name: 'Soybean Oil', sku: 'ING-OIL', unit: 'l', stock: 40, reorder: 15, cost: 175 },
  { name: 'Milk', sku: 'ING-MILK', unit: 'l', stock: 30, reorder: 10, cost: 90 },
  { name: 'Yogurt', sku: 'ING-YOGURT', unit: 'kg', stock: 15, reorder: 6, cost: 130 },
  { name: 'Butter', sku: 'ING-BUTTER', unit: 'kg', stock: 8, reorder: 3, cost: 720 },
  { name: 'Sugar', sku: 'ING-SUGAR', unit: 'kg', stock: 30, reorder: 10, cost: 125 },
  { name: 'Salt', sku: 'ING-SALT', unit: 'kg', stock: 18, reorder: 5, cost: 40 },
  { name: 'Garam Masala', sku: 'ING-GARAM', unit: 'kg', stock: 3, reorder: 1, cost: 1400 },
  { name: 'Tea Leaves', sku: 'ING-TEA', unit: 'kg', stock: 5, reorder: 2, cost: 650 },
  { name: 'Mineral Water 500ml', sku: 'ING-WATER', unit: 'pcs', stock: 120, reorder: 48, cost: 15 },
];

const CATEGORIES = ['Appetizers', 'Main Course', 'Rice & Biryani', 'Breads', 'Desserts', 'Beverages'];

const MENU: { name: string; category: string; price: number; prep: number; recipe: [string, number, Unit][] }[] = [
  { name: 'Chicken Pakora', category: 'Appetizers', price: 240, prep: 12, recipe: [['ING-CHICKEN', 180, 'g'], ['ING-FLOUR', 60, 'g'], ['ING-OIL', 80, 'ml']] },
  { name: 'Vegetable Samosa', category: 'Appetizers', price: 120, prep: 10, recipe: [['ING-POTATO', 150, 'g'], ['ING-FLOUR', 80, 'g'], ['ING-OIL', 60, 'ml']] },
  { name: 'Prawn Tempura', category: 'Appetizers', price: 480, prep: 14, recipe: [['ING-PRAWN', 160, 'g'], ['ING-FLOUR', 50, 'g'], ['ING-OIL', 90, 'ml']] },
  { name: 'Chicken Tikka', category: 'Main Course', price: 380, prep: 20, recipe: [['ING-CHICKEN', 250, 'g'], ['ING-YOGURT', 80, 'g'], ['ING-GARAM', 6, 'g']] },
  { name: 'Butter Chicken', category: 'Main Course', price: 420, prep: 22, recipe: [['ING-CHICKEN', 240, 'g'], ['ING-BUTTER', 40, 'g'], ['ING-TOMATO', 120, 'g']] },
  { name: 'Beef Bhuna', category: 'Main Course', price: 520, prep: 28, recipe: [['ING-BEEF', 260, 'g'], ['ING-ONION', 120, 'g'], ['ING-OIL', 50, 'ml']] },
  { name: 'Fish Curry', category: 'Main Course', price: 390, prep: 24, recipe: [['ING-FISH', 220, 'g'], ['ING-ONION', 80, 'g'], ['ING-OIL', 45, 'ml']] },
  { name: 'Chicken Biryani', category: 'Rice & Biryani', price: 460, prep: 30, recipe: [['ING-RICE', 250, 'g'], ['ING-CHICKEN', 220, 'g'], ['ING-ONION', 100, 'g'], ['ING-GARAM', 10, 'g']] },
  { name: 'Beef Tehari', category: 'Rice & Biryani', price: 480, prep: 32, recipe: [['ING-RICE', 240, 'g'], ['ING-BEEF', 200, 'g'], ['ING-OIL', 70, 'ml']] },
  { name: 'Plain Rice', category: 'Rice & Biryani', price: 90, prep: 8, recipe: [['ING-RICE', 180, 'g'], ['ING-SALT', 3, 'g']] },
  { name: 'Butter Naan', category: 'Breads', price: 70, prep: 7, recipe: [['ING-FLOUR', 100, 'g'], ['ING-BUTTER', 15, 'g']] },
  { name: 'Roti', category: 'Breads', price: 30, prep: 5, recipe: [['ING-FLOUR', 70, 'g']] },
  { name: 'Paratha', category: 'Breads', price: 50, prep: 8, recipe: [['ING-FLOUR', 90, 'g'], ['ING-OIL', 25, 'ml']] },
  { name: 'Gulab Jamun', category: 'Desserts', price: 140, prep: 6, recipe: [['ING-MILK', 120, 'ml'], ['ING-SUGAR', 80, 'g'], ['ING-FLOUR', 40, 'g']] },
  { name: 'Firni', category: 'Desserts', price: 160, prep: 8, recipe: [['ING-MILK', 200, 'ml'], ['ING-RICE', 40, 'g'], ['ING-SUGAR', 50, 'g']] },
  { name: 'Masala Tea', category: 'Beverages', price: 60, prep: 5, recipe: [['ING-TEA', 8, 'g'], ['ING-MILK', 120, 'ml'], ['ING-SUGAR', 15, 'g']] },
  { name: 'Mineral Water', category: 'Beverages', price: 25, prep: 1, recipe: [['ING-WATER', 1, 'pcs']] },
];

const TABLES = [
  { label: 'T-01', capacity: 2 }, { label: 'T-02', capacity: 2 }, { label: 'T-03', capacity: 4 },
  { label: 'T-04', capacity: 4 }, { label: 'T-05', capacity: 4 }, { label: 'T-06', capacity: 6 },
  { label: 'T-07', capacity: 6 }, { label: 'T-08', capacity: 8 }, { label: 'T-09', capacity: 2 },
  { label: 'T-10', capacity: 10 },
];

const STAFF = [
  { name: env.SEED_ADMIN_NAME, email: env.SEED_ADMIN_EMAIL, role: 'admin' as const, password: env.SEED_ADMIN_PASSWORD },
  { name: 'Nusrat Jahan', email: 'manager@restaurant.local', role: 'manager' as const, password: env.SEED_DEFAULT_PASSWORD },
  { name: 'Tanvir Hasan', email: 'waiter@restaurant.local', role: 'waiter' as const, password: env.SEED_DEFAULT_PASSWORD },
  { name: 'Rashed Khan', email: 'chef@restaurant.local', role: 'chef' as const, password: env.SEED_DEFAULT_PASSWORD },
];

async function run(): Promise<void> {
  await connectDatabase();
  if (process.argv.includes('--fresh')) {
    await mongoose.connection.dropDatabase();
    console.log('dropped database');
  }

  for (const person of STAFF) {
    if (!(await User.findOne({ email: person.email }))) {
      await User.create({ name: person.name, email: person.email, role: person.role, passwordHash: person.password });
    }
  }

  const categoryByName = new Map<string, mongoose.Types.ObjectId>();
  for (const [index, name] of CATEGORIES.entries()) {
    const doc = await Category.findOneAndUpdate(
      { slug: toSlug(name) },
      { $set: { name, sortOrder: index } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    categoryByName.set(name, doc._id);
  }

  const ingredientBySku = new Map<string, mongoose.Types.ObjectId>();
  for (const ing of INGREDIENTS) {
    const doc = await Ingredient.findOneAndUpdate(
      { sku: ing.sku },
      { $set: { name: ing.name, unit: ing.unit, reorderLevel: ing.reorder, costPerUnit: ing.cost },
        $setOnInsert: { currentStock: ing.stock } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    ingredientBySku.set(ing.sku, doc._id);
  }

  for (const [index, item] of MENU.entries()) {
    await MenuItem.findOneAndUpdate(
      { slug: toSlug(item.name) },
      { $set: {
        name: item.name,
        category: categoryByName.get(item.category)!,
        price: item.price,
        prepTimeMinutes: item.prep,
        sortOrder: index,
        recipe: item.recipe.map(([sku, quantity, unit]) => ({ ingredient: ingredientBySku.get(sku)!, quantity, unit })),
      } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  }

  for (const table of TABLES) {
    await Table.findOneAndUpdate({ label: table.label }, { $set: { capacity: table.capacity } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  }

  console.log(`seeded: ${STAFF.length} users, ${CATEGORIES.length} categories, ${INGREDIENTS.length} ingredients, ${MENU.length} menu items, ${TABLES.length} tables`);
  await disconnectDatabase();
}

run().catch(async (err) => {
  console.error('seed failed:', err instanceof Error ? err.message : err);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
