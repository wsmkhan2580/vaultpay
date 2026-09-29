import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: '2024-06-20',
});
