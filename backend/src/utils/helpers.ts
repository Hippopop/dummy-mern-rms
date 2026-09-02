import type { Request, Response } from 'express';
import slugify from 'slugify';
import { ApiError } from './ApiError.js';
import type { Unit } from '../types/enums.js';

export function ok<T>(res: Response, message: string, data: T, meta?: unknown, status = 200): Response {
  return res.status(status).json({ success: true, message, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, message: string, data: T): Response {
  return ok(res, message, data, undefined, 201);
}

export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') throw ApiError.badRequest(`Missing route parameter "${name}"`, 'BAD_PARAM');
  return value;
}

export function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true });
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const FACTORS: Record<Unit, { dim: string; factor: number }> = {
  kg: { dim: 'mass', factor: 1000 },
  g: { dim: 'mass', factor: 1 },
  l: { dim: 'volume', factor: 1000 },
  ml: { dim: 'volume', factor: 1 },
  pcs: { dim: 'count', factor: 1 },
};

export function areCompatible(a: Unit, b: Unit): boolean {
  return FACTORS[a].dim === FACTORS[b].dim;
}

export function convert(quantity: number, from: Unit, to: Unit): number {
  if (!areCompatible(from, to)) {
    throw ApiError.badRequest(`Cannot convert ${from} to ${to}`, 'UNIT_MISMATCH');
  }
  if (from === to) return quantity;
  return roundQty((quantity * FACTORS[from].factor) / FACTORS[to].factor);
}
