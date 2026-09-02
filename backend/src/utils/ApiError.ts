export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(m: string, c = 'BAD_REQUEST', d?: unknown) { return new ApiError(400, m, c, d); }
  static unauthorized(m = 'Authentication required', c = 'UNAUTHENTICATED') { return new ApiError(401, m, c); }
  static forbidden(m = 'Permission denied', c = 'FORBIDDEN') { return new ApiError(403, m, c); }
  static notFound(m = 'Resource not found', c = 'NOT_FOUND') { return new ApiError(404, m, c); }
  static conflict(m: string, c = 'CONFLICT', d?: unknown) { return new ApiError(409, m, c, d); }
  static unprocessable(m: string, c = 'UNPROCESSABLE', d?: unknown) { return new ApiError(422, m, c, d); }
}
