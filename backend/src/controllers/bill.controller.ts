import type { Request, Response } from 'express';
import { z } from 'zod';
import { Bill, Counter, Customer, Order, Table } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok, param, round2 } from '../utils/helpers.js';
import { RESTAURANT } from '../config/restaurant.js';
import { PAYMENT_METHODS } from '../types/enums.js';

export const payBillSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
});

export async function createBill(req: Request, res: Response): Promise<Response> {
  const orderId = param(req, 'orderId');

  const order = await Order.findById(orderId).populate<{ customer: { name: string; phone: string } }>('customer', 'name phone');
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.status === 'cancelled') throw ApiError.conflict('A cancelled order cannot be billed', 'ORDER_CANCELLED');
  if (order.bill) throw ApiError.conflict(`Order ${order.orderNumber} already has a bill`, 'ALREADY_BILLED');

  const subtotal = order.subtotal();
  const taxAmount = round2((subtotal * RESTAURANT.taxPercent) / 100);
  const serviceChargeAmount = round2((subtotal * RESTAURANT.serviceChargePercent) / 100);
  const total = round2(subtotal + taxAmount + serviceChargeAmount);

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const billNumber = await Counter.formatted(RESTAURANT.billPrefix, `bill:${today}`);

  const bill = await Bill.create({
    billNumber,
    order: order._id,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    subtotal,
    taxPercent: RESTAURANT.taxPercent,
    taxAmount,
    serviceChargePercent: RESTAURANT.serviceChargePercent,
    serviceChargeAmount,
    total,
    issuedBy: req.user!.id,
  });

  order.bill = bill._id;
  await order.save();

  return created(res, `Bill ${billNumber} generated`, { ...bill.toObject(), id: String(bill._id), restaurant: RESTAURANT });
}

export async function payBill(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const { paymentMethod } = req.body as { paymentMethod: string };

  const bill = await Bill.findById(id);
  if (!bill) throw ApiError.notFound('Bill not found', 'BILL_NOT_FOUND');
  if (bill.status === 'paid') throw ApiError.conflict(`${bill.billNumber} is already paid`, 'ALREADY_PAID');

  bill.status = 'paid';
  bill.paymentMethod = paymentMethod as never;
  bill.paidAt = new Date();
  await bill.save();

  const order = await Order.findById(bill.order);
  if (order) {
    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    // Paying the bill is what frees the table.
    await Table.updateOne(
      { _id: order.table },
      { $set: { status: 'available', currentOrder: null, assignedWaiter: null, guestCount: 0, occupiedAt: null } },
    );
    await Customer.updateOne(
      { _id: order.customer },
      { $inc: { visitCount: 1, totalSpend: bill.total } },
    );
  }

  return ok(res, `${bill.billNumber} paid — table cleared`, { ...bill.toObject(), id });
}

export async function listBills(req: Request, res: Response): Promise<Response> {
  const { status } = req.query as { status?: string };
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const bills = await Bill.find(filter)
    .populate({ path: 'order', select: 'orderNumber' })
    .populate({ path: 'issuedBy', select: 'name' })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return ok(res, 'Bills fetched', bills.map((b) => ({ ...b, id: String(b._id) })));
}

export async function getBill(req: Request, res: Response): Promise<Response> {
  const bill = await Bill.findById(param(req, 'id'))
    .populate({ path: 'order', select: 'orderNumber items guestCount' })
    .populate({ path: 'issuedBy', select: 'name' })
    .lean();
  if (!bill) throw ApiError.notFound('Bill not found', 'BILL_NOT_FOUND');
  return ok(res, 'Bill fetched', { ...bill, id: String(bill._id), restaurant: RESTAURANT });
}
