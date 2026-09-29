import { Schema, model, Document } from 'mongoose';

/**
 * Records every Stripe event ID we have successfully processed.
 * Stripe guarantees at-least-once delivery, so the webhook handler must
 * check this collection before acting on an event, and insert into it
 * (guarded by the unique index) before/while processing to stay idempotent
 * even under concurrent duplicate deliveries.
 */
export interface IProcessedWebhookEvent extends Document {
  stripeEventId: string;
  type: string;
  processedAt: Date;
}

const schema = new Schema<IProcessedWebhookEvent>({
  stripeEventId: { type: String, required: true, unique: true, index: true },
  type: { type: String, required: true },
  processedAt: { type: Date, default: () => new Date() },
});

export const ProcessedWebhookEvent = model<IProcessedWebhookEvent>(
  'ProcessedWebhookEvent',
  schema
);
