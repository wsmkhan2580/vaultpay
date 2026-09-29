import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/tokens';
import { User, UserRole } from '../models/User';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the JWT access token on every protected request. This is the
 * single, centralized authentication gate — no route should implement its
 * own ad hoc token check.
 *
 * The token is read from the Authorization header ("Bearer <token>").
 * Nothing here trusts any client-supplied identity field other than what
 * came out of a token this server itself signed.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or malformed authorization header');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) throw ApiError.unauthorized('Missing access token');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token');
    }

    // Re-derive the user's current role/status from the database on every
    // request rather than trusting stale claims baked into an old token —
    // this ensures a suspended user or a demoted admin is cut off immediately.
    const user = await User.findById(payload.sub).select('role status');
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is not active');

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}
