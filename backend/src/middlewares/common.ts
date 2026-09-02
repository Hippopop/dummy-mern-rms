import type { NextFunction, Request, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError, type ZodType } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { isProduction } from '../config/env.js';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function validate(schemas: { body?: ZodType; query?: ZodType; params?: ZodType }) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        Object.defineProperty(req, 'query', {
          value: schemas.query.parse(req.query), writable: true, configurable: true,
        });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let message = 'Something went wrong';
  let code = 'INTERNAL_ERROR';
  let errors: { field: string; message: string }[] | undefined;

  if (err instanceof ApiError) {
    status = err.statusCode; message = err.message; code = err.code;
    if (err.details) errors = err.details as typeof errors;
  } else if (err instanceof ZodError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Request validation failed';
    errors = err.issues.map((i) => ({ field: i.path.join('.') || '(body)', message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Document validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400; code = 'INVALID_ID'; message = `"${String(err.value)}" is not a valid id`;
  } else if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    status = 409; code = 'DUPLICATE_KEY';
    const key = Object.keys((err as { keyValue?: Record<string, unknown> }).keyValue ?? {})[0] ?? 'field';
    message = `A record with that ${key} already exists`;
  } else if (err instanceof Error && err.name === 'TokenExpiredError') {
    status = 401; code = 'TOKEN_EXPIRED'; message = 'Access token has expired';
  } else if (err instanceof Error && err.name === 'JsonWebTokenError') {
    status = 401; code = 'TOKEN_INVALID'; message = 'Access token is invalid';
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (status >= 500 && !isProduction) console.error(err);
  res.status(status).json({ success: false, message, code, ...(errors ? { errors } : {}) });
}
