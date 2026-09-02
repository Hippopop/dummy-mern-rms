import type { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/helpers.js';
import { ROLE_ACCESS } from '../config/roles.js';
import {
  REFRESH_COOKIE, issueRefreshToken, refreshCookieOptions, revokeAllForUser,
  revokeRefreshToken, rotateRefreshToken, signAccessToken,
} from '../services/token.service.js';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Needs a lowercase letter')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[0-9]/, 'Needs a number'),
});

const MAX_FAILED = 5;

function publicUser(user: { _id: unknown; name: string; email: string; phone: string; role: keyof typeof ROLE_ACCESS; mustChangePassword: boolean }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    access: ROLE_ACCESS[user.role],
    mustChangePassword: user.mustChangePassword,
  };
}

export async function login(req: Request, res: Response): Promise<Response> {
  const { email, password } = req.body as { email: string; password: string };
  const invalid = () => ApiError.unauthorized('Email or password is incorrect', 'INVALID_CREDENTIALS');

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw invalid();
  if (!(await user.comparePassword(password))) throw invalid();
  if (!user.isActive) throw ApiError.forbidden('This account has been suspended', 'ACCOUNT_SUSPENDED');

  user.lastLoginAt = new Date();
  await user.save();

  const refresh = await issueRefreshToken(String(user._id));
  res.cookie(REFRESH_COOKIE, refresh.raw, refreshCookieOptions(refresh.expiresAt));

  return ok(res, 'Signed in', {
    accessToken: signAccessToken({ sub: String(user._id), tv: user.tokenVersion, role: user.role }),
    user: publicUser(user),
  });
}

export async function refresh(req: Request, res: Response): Promise<Response> {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!raw) throw ApiError.unauthorized('No refresh token supplied', 'NO_REFRESH_TOKEN');

  const { userId, issued } = await rotateRefreshToken(raw);
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized('Account no longer exists', 'USER_NOT_FOUND');
  if (!user.isActive) throw ApiError.forbidden('This account has been suspended', 'ACCOUNT_SUSPENDED');

  res.cookie(REFRESH_COOKIE, issued.raw, refreshCookieOptions(issued.expiresAt));
  return ok(res, 'Session refreshed', {
    accessToken: signAccessToken({ sub: userId, tv: user.tokenVersion, role: user.role }),
    user: publicUser(user),
  });
}

export async function logout(req: Request, res: Response): Promise<Response> {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (raw) await revokeRefreshToken(raw);
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(new Date(0)), expires: undefined });
  return ok(res, 'Signed out', null);
}

export async function me(req: Request, res: Response): Promise<Response> {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.unauthorized('Account no longer exists', 'USER_NOT_FOUND');
  return ok(res, 'Current user', publicUser(user));
}

export async function changePassword(req: Request, res: Response): Promise<Response> {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const user = await User.findById(req.user!.id).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Account no longer exists', 'USER_NOT_FOUND');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  user.passwordHash = newPassword;
  user.mustChangePassword = false;
  user.tokenVersion += 1;
  await user.save();
  await revokeAllForUser(String(user._id));

  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(new Date(0)), expires: undefined });
  return ok(res, 'Password changed. Please sign in again.', null);
}

void MAX_FAILED;
