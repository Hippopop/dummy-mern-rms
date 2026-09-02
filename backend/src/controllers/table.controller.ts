import type { Request, Response } from 'express';
import { z } from 'zod';
import { Table } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok, param } from '../utils/helpers.js';

export const createTableSchema = z.object({
  label: z.string().trim().min(1).max(20),
  capacity: z.coerce.number().int().min(1).max(50),
});

export const updateTableSchema = z.object({
  label: z.string().trim().min(1).max(20).optional(),
  capacity: z.coerce.number().int().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export async function listTables(req: Request, res: Response): Promise<Response> {
  const { status, minSeats } = req.query as { status?: string; minSeats?: string };
  const filter: Record<string, unknown> = { isActive: true };
  if (status) filter.status = status;
  if (minSeats) filter.capacity = { $gte: Number(minSeats) };

  const tables = await Table.find(filter)
    .populate({ path: 'assignedWaiter', select: 'name' })
    .populate({ path: 'currentOrder', select: 'orderNumber status' })
    .sort({ label: 1 })
    .lean();

  return ok(res, 'Tables fetched', tables.map((t) => ({ ...t, id: String(t._id) })));
}

export async function createTable(req: Request, res: Response): Promise<Response> {
  const body = req.body as z.infer<typeof createTableSchema>;
  if (await Table.exists({ label: body.label })) {
    throw ApiError.conflict(`Table "${body.label}" already exists`, 'DUPLICATE_KEY');
  }
  const table = await Table.create(body);
  return created(res, 'Table created', { ...table.toObject(), id: String(table._id) });
}

export async function updateTable(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const table = await Table.findById(id);
  if (!table) throw ApiError.notFound('Table not found', 'TABLE_NOT_FOUND');
  if (table.status === 'occupied' && req.body.isActive === false) {
    throw ApiError.conflict(`Table "${table.label}" is occupied`, 'TABLE_OCCUPIED');
  }
  Object.assign(table, req.body);
  await table.save();
  return ok(res, 'Table updated', { ...table.toObject(), id });
}
