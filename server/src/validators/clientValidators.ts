import { z } from 'zod';
import { passwordSchema } from './authValidators';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const createClientSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(120),
      email: z.string().email().max(254),
      password: passwordSchema,
      companyName: z.string().min(1).max(200),
      contactEmail: z.string().email().max(254),
      billingAddress: z.string().max(500).optional(),
    })
    .strict(),
});

export const updateClientStatusSchema = z.object({
  body: z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).strict(),
  params: z.object({ id: objectId }).strict(),
});

export const clientIdParamSchema = z.object({
  params: z.object({ id: objectId }).strict(),
});
