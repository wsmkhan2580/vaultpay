import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController';

const router = Router();

// express.raw() preserves the exact byte stream Stripe signed. This MUST
// stay raw — mounting express.json() globally before this route (or
// re-ordering app.ts) would break signature verification. See app.ts for
// how this route is mounted ahead of the global JSON body parser.
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
