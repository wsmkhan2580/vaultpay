import { z } from 'zod';

// Strong password policy: min length + complexity. "Rejection of common/breached
// passwords" is enforced via a small blocklist here; swap in a k-anonymity
// HaveIBeenPwned check in production for full coverage.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', '12345678', 'qwerty123', 'letmein123', 'admin1234',
  'welcome123', 'password123', 'iloveyou1', '123456789',
]);

const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol')
  .refine((val) => !COMMON_PASSWORDS.has(val.toLowerCase()), {
    message: 'This password is too common. Choose a stronger one.',
  });

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email().max(254),
      password: z.string().min(1).max(128),
    })
    .strict(),
});

export const registerClientSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(120),
      email: z.string().email().max(254),
      password: passwordSchema,
      companyName: z.string().min(1).max(200),
      contactEmail: z.string().email().max(254).optional(),
    })
    .strict(),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1).max(128),
      newPassword: passwordSchema,
    })
    .strict(),
});

export { passwordSchema };
