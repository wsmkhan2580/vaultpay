import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

// Deliberately the ONLY field accepted from the client to create a payment.
// amount/currency/clientId are re-derived server-side from the invoice —
// see Section 11 of the brief ("Never trust an invoice amount supplied by
// the client during payment creation").
export const createPaymentSchema = z.object({
  body: z
    .object({
      invoiceId: objectId,
    })
    .strict(),
});
