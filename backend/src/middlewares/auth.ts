import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/index.js';
import { verifyAccessToken } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { can, type Resource } from '../config/roles.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized('Authentication required', 'NO_TOKEN');

    const payload = verifyAccessToken(header.slice(7).trim());
    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('Account no longer exists', 'USER_NOT_FOUND');
    if (!user.isActive) throw ApiError.forbidden('This account has been suspended', 'ACCOUNT_SUSPENDED');
    if (user.tokenVersion !== payload.tv) {
      throw ApiError.unauthorized('Session was revoked — please sign in again', 'TOKEN_REVOKED');
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function allow(resource: Resource, level: 'read' | 'write') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required', 'NO_TOKEN'));
    if (!can(req.user.role, resource, level)) {
      return next(ApiError.forbidden(
        `Your role (${req.user.role}) does not have ${level} access to ${resource}`,
        'FORBIDDEN',
      ));
    }
    next();
  };
}
