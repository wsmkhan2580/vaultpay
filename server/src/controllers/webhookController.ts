import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { processStripeEvent } from '../services/webhookService';
import { logger } from '../utils/logger';

/**
 * Stripe webhook endpoint. CRITICAL: this route is mounted with
 * express.raw({ type: 'application/json' }) in app.ts — NOT express.json() —
 * so req.body here is the raw Buffer that Stripe signed. Running the normal
 * JSON body parser ahead of this route would silently break (or disable)
 * signature verification, which is exactly the mistake Section 10 of the
 * brief calls out.
 */
export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || typeof signature !== 'string') {
    res.status(400).send('Missing Stripe signature header');
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  // Acknowledge receipt immediately after verification; do the actual work
  // and return 200 only once processing succeeds so Stripe retries on
  // transient failures (processing is idempotent, so retries are safe).
  try {
    await processStripeEvent(event);
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Error processing Stripe webhook event', {
      eventId: event.id,
      type: event.type,
      error: err instanceof Error ? err.message : 'unknown',
    });
    // Return 500 so Stripe retries delivery; our idempotency guard makes
    // retries safe.
    res.status(500).json({ received: false });
  }
});
