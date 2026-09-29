import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../models/User';

/**
 * Role-based authorization. Must run after `authenticate`.
 *
 * This is a distinct, separate check from resource ownership (see
 * services/*.ts for ownership-aware queries) — role tells us WHAT KIND of
 * actions a user may attempt; ownership tells us WHICH resources they may
 * touch. Both are enforced server-side and neither substitutes for the other.
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(ApiError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
