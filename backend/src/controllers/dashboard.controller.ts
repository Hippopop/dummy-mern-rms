import type { Request, Response } from 'express';
import { Bill, Ingredient, Order, Table } from '../models/index.js';
import { ok, round2 } from '../utils/helpers.js';

export async function getDashboard(_req: Request, res: Response): Promise<Response> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [revenueToday, topItems, tables, activeOrders, lowStock, recentBills] = await Promise.all([
    Bill.aggregate<{ total: number; count: number }>([
      { $match: { status: 'paid', paidAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: string; quantity: number; revenue: number }>([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.name',
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
      } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
    Table.aggregate<{ _id: string; count: number }>([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ status: { $in: ['placed', 'preparing', 'ready', 'served'] } }),
    Ingredient.countDocuments({ isActive: true, $expr: { $lte: ['$currentStock', '$reorderLevel'] } }),
    Bill.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(5).select('billNumber customerName total paidAt').lean(),
  ]);

  const tableCounts = Object.fromEntries(tables.map((t) => [t._id, t.count]));

  return ok(res, 'Dashboard fetched', {
    revenueToday: round2(revenueToday[0]?.total ?? 0),
    billsToday: revenueToday[0]?.count ?? 0,
    popularItems: topItems.map((t) => ({ name: t._id, quantity: t.quantity, revenue: round2(t.revenue) })),
    tables: {
      available: tableCounts.available ?? 0,
      occupied: tableCounts.occupied ?? 0,
      total: (tableCounts.available ?? 0) + (tableCounts.occupied ?? 0),
    },
    activeOrders,
    lowStockCount: lowStock,
    recentBills: recentBills.map((b) => ({ ...b, id: String(b._id) })),
  });
}
