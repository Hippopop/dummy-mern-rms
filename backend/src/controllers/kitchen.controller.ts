import type { Request, Response } from 'express';
import { z } from 'zod';
import { MenuItem, Order } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, param } from '../utils/helpers.js';
import { checkIngredients, consumeIngredients } from '../services/kitchen.service.js';

export const cookSchema = z.object({
  menuItem: z.string().regex(/^[0-9a-fA-F]{24}$/),
  portions: z.coerce.number().int().min(1).max(50).optional().default(1),
});

// The kitchen queue is derived from live orders — there is no separate model.
export async function getQueue(_req: Request, res: Response): Promise<Response> {
  const orders = await Order.find({ status: { $in: ['placed', 'preparing', 'ready'] } })
    .populate({ path: 'table', select: 'label' })
    .sort({ placedAt: 1 })
    .lean();

  const tickets = orders.map((order) => ({
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    table: (order.table as unknown as { label: string })?.label ?? '—',
    placedAt: order.placedAt,
    waitingMinutes: Math.floor((Date.now() - new Date(order.placedAt).getTime()) / 60_000),
    items: order.items
      .filter((i) => i.status !== 'served')
      .map((i) => ({
        itemId: String(i._id),
        name: i.name,
        quantity: i.quantity,
        notes: i.notes,
        status: i.status,
      })),
  })).filter((t) => t.items.length > 0);

  return ok(res, 'Kitchen queue fetched', {
    tickets,
    pendingItems: tickets.reduce((s, t) => s + t.items.filter((i) => i.status !== 'ready').length, 0),
  });
}

export async function setItemStatus(req: Request, res: Response): Promise<Response> {
  const orderId = param(req, 'orderId');
  const itemId = param(req, 'itemId');
  const { status } = req.body as { status: 'preparing' | 'ready' | 'served' };

  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');

  const item = order.items.find((i) => String(i._id) === itemId);
  if (!item) throw ApiError.notFound('Order line not found', 'ITEM_NOT_FOUND');

  // Ingredients leave the store room when the cook actually starts the dish.
  if (status === 'preparing' && item.status === 'queued') {
    await consumeIngredients(String(item.menuItem), item.quantity);
  }

  item.status = status;
  if (status === 'ready') item.readyAt = new Date();
  order.status = order.deriveStatus();
  await order.save();

  return ok(res, `"${item.name}" marked ${status}`, { orderId, itemId, status, orderStatus: order.status });
}

// Cook something without an order, for example to refill a display counter.
export async function cookOnDemand(req: Request, res: Response): Promise<Response> {
  const { menuItem, portions } = req.body as z.infer<typeof cookSchema>;

  const item = await MenuItem.findById(menuItem).select('name recipe').lean();
  if (!item) throw ApiError.notFound('Menu item not found', 'MENU_ITEM_NOT_FOUND');

  await consumeIngredients(menuItem, portions);
  return ok(res, `Cooked ${portions} × "${item.name}"`, {
    menuItem, portions, remaining: await checkIngredients(item.recipe),
  });
}
