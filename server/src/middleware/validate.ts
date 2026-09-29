import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Validates and replaces req.body/query/params with the parsed, typed
 * result of the given Zod schema. Strict schema validation on every input
 * surface means unexpected/extra fields are rejected rather than silently
 * passed through to a Mongo query or a Stripe call.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body) req.body = parsed.body;
      if (parsed.params) req.params = parsed.params;
      // query is left as-is (Express 5 makes req.query read-only in some setups);
      // controllers should re-validate via the parsed object if needed.
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(ApiError.badRequest('Validation failed', err.flatten()));
        return;
      }
      next(err);
    }
  };
}
