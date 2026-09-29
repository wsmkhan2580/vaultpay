import { stripe } from '../config/stripe';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { Client } from '../models/Client';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { recordAudit } from './auditService';

const PAYABLE_STATUSES = new Set(['PENDING', 'OVERDUE']);

/**
 * Creates a Stripe Checkout Session for a client's own invoice.
 *
 * Follows the exact order required by the brief (Section 11):
 * 1. Authenticate (done by middleware before this is ever called)
 * 2. Verify role (done by middleware/route — CLIENT only)
 * 3. Verify the invoice exists
 * 4. Verify the invoice belongs to the authenticated client (ownership query)
 * 5. Verify the invoice is in a payable state
 * 6. Retrieve the amount from the database — never from the request body
 * 7. Create the Stripe payment using that server-side amount
 */
export async function createCheckoutSessionForInvoice(params: { clientUserId: string; invoiceId: string }) {
  const client = await Client.findOne({ userId: params.clientUserId });
  if (!client) throw ApiError.notFound('Client profile not found');

  // Ownership-aware query — an invoice belonging to a different client is
  // indistinguishable from a non-existent one to this endpoint.
  const invoice = await Invoice.findOne({ _id: params.invoiceId, clientId: client._id });
  if (!invoice) throw ApiError.notFound('Invoice not found');

  if (!PAYABLE_STATUSES.has(invoice.status)) {
    if (invoice.status === 'PAID') throw ApiError.conflict('This invoice has already been paid');
    throw ApiError.badRequest(`Invoice is not payable in its current status (${invoice.status})`);
  }

  // Guard against a duplicate in-flight payment for the same invoice.
  const existingPending = await Payment.findOne({ invoiceId: invoice._id, status: 'PENDING' }).sort({ createdAt: -1 });
  if (existingPending && existingPending.stripeCheckoutSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(existingPending.stripeCheckoutSessionId);
      if (session.status === 'open' && session.url) {
        return { checkoutUrl: session.url, paymentId: existingPending._id.toString() };
      }
    } catch {
      // fall through and create a fresh session if the old one can't be retrieved
    }
  }

  const amountInMinorUnits = Math.round(invoice.amount * 100); // Stripe expects the smallest currency unit

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: invoice.currency,
          product_data: { name: `Invoice ${invoice.invoiceNumber}`, description: invoice.description || undefined },
          unit_amount: amountInMinorUnits,
        },
        quantity: 1,
      },
    ],
    success_url: `${env.clientUrl}/client/invoices/${invoice._id.toString()}?payment=success`,
    cancel_url: `${env.clientUrl}/client/invoices/${invoice._id.toString()}?payment=cancelled`,
    // Metadata is the link back to our records — the webhook handler treats
    // this as a hint only and re-verifies everything against the database,
    // never trusting Stripe metadata as the sole source of truth for identity.
    metadata: {
      invoiceId: invoice._id.toString(),
      clientId: client._id.toString(),
    },
  });

  const payment = await Payment.create({
    invoiceId: invoice._id,
    clientId: client._id,
    stripeCheckoutSessionId: session.id,
    amount: invoice.amount,
    currency: invoice.currency,
    status: 'PENDING',
  });

  await recordAudit({
    actor: params.clientUserId,
    action: 'PAYMENT_INITIATED',
    resource: 'Payment',
    resourceId: payment._id.toString(),
    metadata: { invoiceId: invoice._id.toString(), amount: invoice.amount },
  });

  if (!session.url) throw ApiError.internal('Stripe did not return a checkout URL');

  return { checkoutUrl: session.url, paymentId: payment._id.toString() };
}

export async function listPaymentsForAdmin(filters: { clientId?: string; status?: string; page?: number; limit?: number }) {
  const query: Record<string, unknown> = {};
  if (filters.clientId) query.clientId = filters.clientId;
  if (filters.status) query.status = filters.status;

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 && filters.limit <= 100 ? filters.limit : 20;

  const [items, total] = await Promise.all([
    Payment.find(query)
      .populate('invoiceId', 'invoiceNumber')
      .populate('clientId', 'companyName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

/** IDOR-safe: only returns a payment that belongs to the requesting client. */
export async function getPaymentForClient(paymentId: string, clientUserId: string) {
  const client = await Client.findOne({ userId: clientUserId });
  if (!client) throw ApiError.notFound('Client profile not found');
  const payment = await Payment.findOne({ _id: paymentId, clientId: client._id });
  if (!payment) throw ApiError.notFound('Payment not found');
  return payment;
}
