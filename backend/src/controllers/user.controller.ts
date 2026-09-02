import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { created, escapeRegex, ok, param } from '../utils/helpers.js';
import { ROLES } from '../config/roles.js';

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(30).optional().default(''),
  role: z.enum(ROLES),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

function temporaryPassword(): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pool = lower + upper + digits;
  const pick = (set: string) => set[randomBytes(1)[0]! % set.length]!;
  const chars = [pick(lower), pick(upper), pick(digits)];
  while (chars.length < 12) chars.push(pick(pool));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

export async function listUsers(req: Request, res: Response): Promise<Response> {
  const { search, role } = req.query as { search?: string; role?: string };
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).sort({ name: 1 }).lean();
  return ok(res, 'Users fetched', users.map((u) => ({ ...u, id: String(u._id), passwordHash: undefined })));
}

export async function createUser(req: Request, res: Response): Promise<Response> {
  const body = req.body as z.infer<typeof createUserSchema>;

  if (await User.exists({ email: body.email })) {
    throw ApiError.conflict('A user with that email already exists', 'DUPLICATE_KEY');
  }

  const password = temporaryPassword();
  const user = await User.create({ ...body, passwordHash: password, mustChangePassword: true });

  return created(res, 'Staff account created', {
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    temporaryPassword: password,
  });
}

export async function updateUser(req: Request, res: Response): Promise<Response> {
  const id = param(req, 'id');
  const body = req.body as z.infer<typeof updateUserSchema>;

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

  if (body.isActive === false || (body.role && body.role !== 'admin' && user.role === 'admin')) {
    const admins = await User.countDocuments({ role: 'admin', isActive: true });
    if (user.role === 'admin' && admins <= 1) {
      throw ApiError.conflict('Cannot change the only remaining admin', 'LAST_ADMIN');
    }
  }
  if (id === req.user!.id && body.isActive === false) {
    throw ApiError.conflict('You cannot suspend your own account', 'SELF_SUSPEND');
  }

  Object.assign(user, body);
  await user.save();
  return ok(res, 'User updated', { ...user.toJSON(), id });
}
