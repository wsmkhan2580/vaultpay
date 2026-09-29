import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Centralized error handler. This is the ONLY place that formats error
 * responses, so the shape is always consistent and production responses
 * never leak stack traces or internal details.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err && typeof err === 'object' && 'name' in err && (err as Error).name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = (err as Error).message;
  } else if (err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource';
  }

  logger.error(message, {
    statusCode,
    path: req.path,
    method: req.method,
    // Never log the error object's full stack/body in structured metadata
    // that could end up including request payloads with sensitive data —
    // log a bounded description only.
    errorName: err instanceof Error ? err.name : typeof err,
  });

  const body: Record<string, unknown> = { success: false, message };
  if (details !== undefined) body.details = details;
  // Stack traces are only ever attached outside production, and only server-side console output
  if (!env.isProduction && err instanceof Error) {
    // eslint-disable-next-line no-console
    console.error(err.stack);
  }

  res.status(statusCode).json(body);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}
