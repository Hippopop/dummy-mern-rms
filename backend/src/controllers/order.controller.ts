import type { Request, Response } from 'express';
import { z } from 'zod';
import { Counter, Customer, MenuItem, Order, Table, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok, param } from '../utils/helpers.js';
import { RESTAURANT } from '../config/restaurant.js';
import { checkIngredients } from '../services/kitchen.service.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

export const createOrderSchema = z.object({
  table: objectId,
  guestCount: z.coerce.number().int().min(1).max(50),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(4).max(30),
  waiter: objectId.optional(),
  items: z.array(z.object({
    menuItem: objectId,
    quantity: z.coerce.number().int().min(1).max(50),
    notes: z.string().trim().max(200).optional().default(''),
  })).min(1, 'An order needs at least one item'),
});

export const addItemsSchema = z.object({
  items: z.array(z.object({
    menuItem: objectId,
    quantity: z.coerce.number().int().min(1).max(50),
    notes: z.string().trim().max(200).optional().default(''),
  })).min(1),
});

export const assignWaiterSchema = z.object({ waiter: objectId });

async function buildLines(requested: { menuItem: string; quantity: number; notes: string }[]) {
  const menuItems = await MenuItem.find({ _id: { $in: requested.map((i) => i.menuItem) }, isActive: true }).lean();
  const byId = new Map(menuItems.map((m) => [String(m._id), m]));

  const lines = [];
  for (const line of requested) {
    const item = byId.get(line.menuItem);
    if (!item) throw ApiError.badRequest(`Menu item ${line.menuItem} does not exist`, 'MENU_ITEM_NOT_FOUND');
    if (!item.isAvailable) throw ApiError.unprocessable(`"${item.name}" is not available right now`, 'ITEM_UNAVAILABLE');

    const availability = await checkIngredients(item.recipe, line.quantity);
    if (!availability.canCook) {
      throw ApiError.unprocessable(
        `Not enough ingredients for "${item.name}": ${availability.shortages
          .map((s) => `${s.name} (need ${s.required}${s.unit}, have ${s.available}${s.unit})`).join('; ')}`,
        'INSUFFICIENT_INGREDIENTS',
      );
    }

    lines.push({
      menuItem: item._id,
      name: item.name,
      unitPrice: item.price,
      quantity: line.quantity,
      notes: line.notes,
      status: 'queued' as const,
      readyAt: null,
    });
  }
  return lines;
}

export async function createOrder(req: Request, res: Response): Promise<Response> {
  const body = req.body as z.infer<typeof createOrderSchema>;

  const table = await Table.findById(body.table);
  if (!table) throw ApiError.notFound('Table not found', 'TABLE_NOT_FOUND');
  if (table.status === 'occupied') throw ApiError.conflict(`Table "${table.label}" is already occupied`, 'TABLE_OCCUPIED');
  if (body.guestCount > table.capacity) {
    throw ApiError.unprocessable(`Table "${table.label}" seats ${table.capacity}, not ${body.guestCount}`, 'OVER_CAPACITY');
  }

  if (body.waiter) {
    const waiter = await User.findById(body.waiter).select('role isActive').lean();
    if (!waiter || !waiter.isActive) throw ApiError.badRequest('That waiter does not exist', 'WAITER_NOT_FOUND');
  }

  // Walk-ins without an account get one created against their phone number.
  const customer = await Customer.findOneAndUpdate(
    { phone: body.customerPhone },
    { $setOnInsert: { name: body.customerName, phone: body.customerPhone } },
    { upsert: true, returnDocument: 'after' },
  );

  const lines = await buildLines(body.items);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const orderNumber = await Counter.formatted(RESTAURANT.orderPrefix, `order:${today}`);

  const order = await Order.create({
    orderNumber,
    table: table._id,
    customer: customer._id,
    waiter: body.waiter ?? req.user!.id,
    guestCount: body.guestCount,
    items: lines,
    status: 'placed',
  });

  table.status = 'occupied';
  table.currentOrder = order._id;
  table.assignedWaiter = (body.waiter ?? req.user!.id) as never;
  table.guestCount = body.guestCount;
  table.occupiedAt = new Date();
  await table.save();

  return created(res, `Order ${orderNumber} placed`, await viewOf(String(order._id)));
}

async function viewOf(id: string) {
  const order = await Order.findById(id)
    .populate({ path: 'table', select: 'label capacity' })
    .populate({ path: 'customer', select: 'name phone' })
    .populate({ path: 'waiter', select: 'name' })
    .lean();
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  const subtotal = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  return { ...order, id: String(order._id), subtotal: Math.round(subtotal * 100) / 100 };
}

export async function listOrders(req: Request, res: Response): Promise<Response> {
  const { status, table } = req.query as { status?: string; table?: string };
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  else filter.status = { $nin: ['completed', 'cancelled'] };
  if (table) filter.table = table;

  const orders = await Order.find(filter)
    .populate({ path: 'table', select: 'label' })
    .populate({ path: 'customer', select: 'name phone' })
    .populate({ path: 'waiter', select: 'name' })
    .sort({ createdAt: -1 })
    .lean();

  return ok(res, 'Orders fetched', orders.map((o) => ({
    ...o, id: String(o._id),
    subtotal: Math.round(o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * 100) / 100,
  })));
}

export async function getOrder(req: Request, res: Response): Promise<Response> {
  return ok(res, 'Order fetched', await viewOf(param(req, 'id')));
}

export async function addItems(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.status === 'completed' || order.status === 'cancelled') {
    throw ApiError.conflict(`Order ${order.orderNumber} is ${order.status}`, 'ORDER_CLOSED');
  }

  const lines = await buildLines((req.body as z.infer<typeof addItemsSchema>).items);
  order.items.push(...(lines as never[]));
  order.status = order.deriveStatus();
  await order.save();

  return ok(res, 'Items added', await viewOf(id));
}

export async function assignWaiter(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const { waiter } = req.body as { waiter: string };

  const staff = await User.findById(waiter).select('name isActive').lean();
  if (!staff || !staff.isActive) throw ApiError.badRequest('That user does not exist', 'WAITER_NOT_FOUND');

  const order = await Order.findByIdAndUpdate(id, { $set: { waiter } }, { returnDocument: 'after' });
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  await Table.updateOne({ _id: order.table }, { $set: { assignedWaiter: waiter } });

  return ok(res, `${staff.name} assigned to ${order.orderNumber}`, await viewOf(id));
}

export async function cancelOrder(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.status === 'completed') throw ApiError.conflict('A completed order cannot be cancelled', 'ORDER_CLOSED');

  order.status = 'cancelled';
  await order.save();
  await Table.updateOne(
    { _id: order.table },
    { $set: { status: 'available', currentOrder: null, assignedWaiter: null, guestCount: 0, occupiedAt: null } },
  );

  return ok(res, `Order ${order.orderNumber} cancelled`, null);
}
