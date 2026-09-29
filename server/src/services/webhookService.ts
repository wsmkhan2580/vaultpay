import mongoose from 'mongoose';
import Stripe from 'stripe';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { Client } from '../models/Client';
import { ProcessedWebhookEvent } from '../models/ProcessedWebhookEvent';
import { logger } from '../utils/logger';
import { recordAudit } from './auditService';
import { generateAndDeliverReceipt } from './receiptService';
import { sendPaymentConfirmationEmail } from './emailService';

/**
 * Processes a verified Stripe webhook event. The caller (webhookController)
 * is responsible for having already verified the event's cryptographic
 * signature via stripe.webhooks.constructEvent — this function trusts the
 * event object it's given, but does NOT trust anything else about payment
 * state that isn't re-derived from our own database.
 *
 * Idempotency: Stripe delivers events at-least-once, so the same event ID
 * may arrive multiple times (including concurrently). We insert the event ID
 * into a uniquely-indexed collection FIRST; if that insert fails on the
 * unique constraint, we know this event was already processed (or is being
 * processed right now) and return immediately without side effects.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  try {
    await ProcessedWebhookEvent.create({ stripeEventId: event.id, type: event.type });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      logger.info('Duplicate Stripe webhook event ignored (idempotency)', { eventId: event.id, type: event.type });
      return;
    }
    throw err;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    default:
      logger.info('Unhandled Stripe event type received', { type: event.type });
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const payment = await Payment.findOne({ stripeCheckoutSessionId: session.id });
  if (!payment) {
    logger.warn('checkout.session.completed for unknown session', { sessionId: session.id });
    return;
  }

  if (payment.status === 'SUCCEEDED') return; // already finalized — idempotent no-op

  if (session.payment_status !== 'paid') {
    logger.info('Checkout session completed but not yet paid', { sessionId: session.id, status: session.payment_status });
    return;
  }

  await finalizePayment(payment._id.toString(), typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id);
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
  // Only act if we can positively correlate this intent to a specific
  // payment record. Falling back to "the most recent PENDING payment"
  // would risk finalizing a DIFFERENT client's payment if multiple checkouts
  // are in flight concurrently — never guess when money is involved.
  // checkout.session.completed (handled above) is the authoritative event
  // for Stripe Checkout payments and always correlates via session ID, so
  // this handler only needs to cover the case where the intent ID was
  // already recorded on a payment from a prior event.
  const payment = await Payment.findOne({ stripePaymentIntentId: intent.id });
  if (!payment) {
    logger.info('payment_intent.succeeded received with no matching payment record yet; deferring to checkout.session.completed', {
      paymentIntentId: intent.id,
    });
    return;
  }
  if (payment.status === 'SUCCEEDED') return;
  await finalizePayment(payment._id.toString(), intent.id);
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  const payment = await Payment.findOne({ stripePaymentIntentId: intent.id });
  if (!payment || payment.status === 'SUCCEEDED') return;

  payment.status = 'FAILED';
  payment.failureReason = intent.last_payment_error?.message || 'Payment failed';
  await payment.save();

  await recordAudit({
    actor: null,
    action: 'PAYMENT_FAILED',
    resource: 'Payment',
    resourceId: payment._id.toString(),
    metadata: { reason: payment.failureReason },
  });
}

/**
 * Atomically: mark payment SUCCEEDED, mark invoice PAID. Uses a MongoDB
 * transaction so these two related financial records can never partially
 * update (Section 7 of the brief). Receipt generation + email happen after
 * the transaction commits, since they involve external I/O (PDF, storage,
 * SMTP) that must not hold the DB transaction open or roll back financial
 * state if e.g. the email provider is briefly down.
 */
async function finalizePayment(paymentId: string, stripePaymentIntentId?: string): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(paymentId).session(session);
      if (!payment || payment.status === 'SUCCEEDED') return;

      const invoice = await Invoice.findById(payment.invoiceId).session(session);
      if (!invoice) throw new Error(`Invoice ${payment.invoiceId} not found during payment finalization`);

      // Never mark PAID based on anything the client sent — only this
      // server-side, webhook-triggered path may transition an invoice to PAID.
      if (invoice.status !== 'PAID') {
        invoice.status = 'PAID';
        invoice.paidAt = new Date();
        await invoice.save({ session });
      }

      payment.status = 'SUCCEEDED';
      payment.paidAt = new Date();
      if (stripePaymentIntentId) payment.stripePaymentIntentId = stripePaymentIntentId;
      await payment.save({ session });
    });
  } finally {
    await session.endSession();
  }

  const payment = await Payment.findById(paymentId);
  const invoice = payment ? await Invoice.findById(payment.invoiceId) : null;
  const client = invoice ? await Client.findById(invoice.clientId) : null;

  if (payment && invoice && client) {
    await recordAudit({
      actor: null,
      action: 'PAYMENT_STATUS_CHANGED',
      resource: 'Payment',
      resourceId: payment._id.toString(),
      metadata: { newStatus: 'SUCCEEDED', invoiceId: invoice._id.toString() },
    });
    await recordAudit({
      actor: null,
      action: 'INVOICE_MARKED_PAID',
      resource: 'Invoice',
      resourceId: invoice._id.toString(),
      metadata: { paymentId: payment._id.toString() },
    });

    try {
      await sendPaymentConfirmationEmail(client, invoice, payment);
      await generateAndDeliverReceipt(invoice, payment, client);
    } catch (err) {
      logger.error('Post-payment fulfillment step failed (receipt/email)', {
        paymentId: payment._id.toString(),
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }
}
