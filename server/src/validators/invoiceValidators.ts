import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

const invoiceItemSchema = z
  .object({
    description: z.string().min(1).max(300),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  })
  .strict();

export const createInvoiceSchema = z.object({
  body: z
    .object({
      clientId: objectId,
      currency: z.string().length(3).default('usd'),
      description: z.string().max(1000).optional(),
      items: z.array(invoiceItemSchema).min(1),
      dueDate: z.string().datetime().or(z.string().min(1)), // ISO date string
      // NOTE: amount is intentionally NOT accepted from the client — it is
      // always computed server-side from `items` (see invoiceService).
    })
    .strict(),
});

export const updateInvoiceSchema = z.object({
  body: z
    .object({
      description: z.string().max(1000).optional(),
      items: z.array(invoiceItemSchema).min(1).optional(),
      dueDate: z.string().min(1).optional(),
      status: z.enum(['DRAFT', 'PENDING', 'CANCELLED', 'OVERDUE']).optional(),
      // PAID is deliberately excluded — only the Stripe webhook flow may set it.
    })
    .strict(),
  params: z.object({ id: objectId }),
});

export const invoiceIdParamSchema = z.object({
  params: z.object({ id: objectId }).strict(),
});

export const listInvoicesQuerySchema = z.object({
  query: z
    .object({
      status: z.enum(['DRAFT', 'PENDING', 'PAID', 'CANCELLED', 'OVERDUE']).optional(),
      clientId: objectId.optional(),
      search: z.string().max(200).optional(),
      page: z.string().regex(/^\d+$/).optional(),
      limit: z.string().regex(/^\d+$/).optional(),
    })
    .strict()
    .optional(),
});
