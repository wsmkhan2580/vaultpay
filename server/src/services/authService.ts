import bcrypt from 'bcrypt';
import { User, IUser, SALT_ROUNDS } from '../models/User';
import { Client } from '../models/Client';
import { ApiError } from '../utils/ApiError';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/tokens';
import { recordAudit } from './auditService';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string };
}

export async function login(email: string, password: string, ip?: string): Promise<LoginResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  // Constant-shape response whether the user exists or not, to avoid
  // leaking which emails are registered via response timing/content.
  if (!user) {
    await recordAudit({ actor: null, actorEmail: normalizedEmail, action: 'LOGIN_FAILED_UNKNOWN_USER', resource: 'User', ip });
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await recordAudit({ actor: user._id.toString(), action: 'LOGIN_BLOCKED_LOCKED', resource: 'User', resourceId: user._id.toString(), ip });
    throw ApiError.unauthorized('Account temporarily locked due to repeated failed attempts. Try again later.');
  }

  if (user.status !== 'ACTIVE') {
    await recordAudit({ actor: user._id.toString(), action: 'LOGIN_BLOCKED_INACTIVE', resource: 'User', resourceId: user._id.toString(), ip });
    throw ApiError.forbidden('This account is not active');
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    await recordAudit({ actor: user._id.toString(), action: 'LOGIN_FAILED_BAD_PASSWORD', resource: 'User', resourceId: user._id.toString(), ip });
    throw ApiError.unauthorized('Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;

  const accessToken = signAccessToken(user._id.toString(), user.role);
  const { token: refreshToken, jti } = signRefreshToken(user._id.toString());
  user.refreshTokenHash = hashToken(jti);
  await user.save();

  await recordAudit({ actor: user._id.toString(), action: 'LOGIN_SUCCESS', resource: 'User', resourceId: user._id.toString(), ip });

  return {
    accessToken,
    refreshToken,
    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
  };
}

export async function logout(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  await recordAudit({ actor: userId, action: 'LOGOUT', resource: 'User', resourceId: userId });
}

export async function refreshTokens(refreshToken: string): Promise<LoginResult> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) throw ApiError.unauthorized('Session no longer valid');

  const presentedHash = hashToken(payload.jti);
  if (presentedHash !== user.refreshTokenHash) {
    // Token reuse detected (rotation mismatch) — a stolen/replayed refresh
    // token was presented after it had already been rotated. Revoke the
    // whole session defensively.
    user.refreshTokenHash = null;
    await user.save();
    await recordAudit({ actor: user._id.toString(), action: 'REFRESH_TOKEN_REUSE_DETECTED', resource: 'User', resourceId: user._id.toString() });
    throw ApiError.unauthorized('Session invalidated. Please log in again.');
  }

  if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is not active');

  // Rotate: issue a brand new refresh token and invalidate the old one immediately.
  const accessToken = signAccessToken(user._id.toString(), user.role);
  const { token: newRefreshToken, jti } = signRefreshToken(user._id.toString());
  user.refreshTokenHash = hashToken(jti);
  await user.save();

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
  };
}

export async function registerClient(input: {
  name: string;
  email: string;
  password: string;
  companyName: string;
  contactEmail?: string;
}): Promise<IUser> {
  const normalizedEmail = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email: normalizedEmail,
    passwordHash,
    role: 'CLIENT',
    status: 'ACTIVE',
  });

  await Client.create({
    userId: user._id,
    companyName: input.companyName,
    contactEmail: input.contactEmail || normalizedEmail,
    status: 'ACTIVE',
  });

  await recordAudit({ actor: user._id.toString(), action: 'CLIENT_REGISTERED', resource: 'User', resourceId: user._id.toString() });

  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw ApiError.unauthorized('Current password is incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  // Invalidate any existing session on password change.
  user.refreshTokenHash = null;
  await user.save();

  await recordAudit({ actor: userId, action: 'PASSWORD_CHANGED', resource: 'User', resourceId: userId });
}
