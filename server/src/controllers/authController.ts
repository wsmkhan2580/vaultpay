import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as authService from '../services/authService';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User';

const REFRESH_COOKIE = 'vp_refresh_token';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
<<<<<<< HEAD
=======
    // 'none' is required for the cookie to be sent across different domains
    // (e.g. a Vercel frontend calling a Render backend) — this only works
    // when 'secure' is also true, which it is in production. In local dev,
    // frontend and backend are usually on http://localhost with different
    // ports, which counts as cross-site too, but browsers won't accept
    // SameSite=None on a non-secure (http) cookie — so 'lax' is used there,
    // which works fine for same-site localhost testing.
>>>>>>> ca2c6d8 (Fix cookies, receipts, add register page, lazy loading, loading messages)
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, req.ip);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, 200, 'Logged in successfully', {
    accessToken: result.accessToken,
    user: result.user,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) await authService.logout(req.user.id);
  res.clearCookie(REFRESH_COOKIE, {
    path: '/api/auth',
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
  });
  sendSuccess(res, 200, 'Logged out successfully');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token provided');
  const result = await authService.refreshTokens(token);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, 200, 'Token refreshed', { accessToken: result.accessToken, user: result.user });
});

export const registerClient = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.registerClient(req.body);
  sendSuccess(res, 201, 'Account created successfully', {
    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound('User not found');
  sendSuccess(res, 200, 'Current user', {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.id, currentPassword, newPassword);
  sendSuccess(res, 200, 'Password changed successfully. Please log in again.');
});
