import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export interface AccessTokenPayload {
  sub: string;
  tv: number;
  role: string;
}

export const REFRESH_COOKIE = 'rms_refresh';
const ROTATION_GRACE_MS = 15_000;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
    issuer: 'rms-api',
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'rms-api' }) as AccessTokenPayload;
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function refreshExpiry(): Date {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES);
  const ms: Record<string, number> = { s: 1e3, m: 60e3, h: 3600e3, d: 86_400e3 };
  return new Date(Date.now() + (match ? Number(match[1]) * ms[match[2]!]! : 7 * 86_400e3));
}

export interface IssuedRefreshToken {
  raw: string;
  expiresAt: Date;
}

function mint(): IssuedRefreshToken {
  return { raw: randomBytes(40).toString('hex'), expiresAt: refreshExpiry() };
}

export async function issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
  const value = mint();
  await RefreshToken.create({ user: userId, tokenHash: hashToken(value.raw), expiresAt: value.expiresAt });
  return value;
}

export async function rotateRefreshToken(raw: string): Promise<{ userId: string; issued: IssuedRefreshToken }> {
  const tokenHash = hashToken(raw);
  const next = mint();

  const claimed = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date(), replacedBy: hashToken(next.raw) } },
    { returnDocument: 'after' },
  );

  if (claimed) {
    if (claimed.expiresAt.getTime() <= Date.now()) {
      throw ApiError.unauthorized('Refresh token has expired', 'REFRESH_EXPIRED');
    }
    const userId = String(claimed.user);
    await RefreshToken.create({ user: userId, tokenHash: hashToken(next.raw), expiresAt: next.expiresAt });
    return { userId, issued: next };
  }

  const existing = await RefreshToken.findOne({ tokenHash });
  if (!existing) throw ApiError.unauthorized('Refresh token is not recognised', 'REFRESH_INVALID');

  const userId = String(existing.user);
  const retiredAgo = Date.now() - (existing.revokedAt?.getTime() ?? 0);

  // A token retired by a rotation moments ago is a second screen refreshing,
  // not a replay. Tokens killed by logout carry no replacedBy and get no grace.
  if (existing.replacedBy && retiredAgo <= ROTATION_GRACE_MS) {
    return { userId, issued: await issueRefreshToken(userId) };
  }

  await RefreshToken.updateMany({ user: existing.user, revokedAt: null }, { $set: { revokedAt: new Date() } });
  throw ApiError.unauthorized('This refresh token was already used. Please sign in again.', 'REFRESH_REUSED');
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await RefreshToken.updateOne({ tokenHash: hashToken(raw), revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllForUser(userId: string): Promise<number> {
  const r = await RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return r.modifiedCount;
}

export function refreshCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    domain: env.COOKIE_DOMAIN,
    path: '/api/v1/auth',
    expires: expiresAt,
  };
}
