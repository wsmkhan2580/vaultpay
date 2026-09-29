import { Schema, model, Document, Types } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  invoiceId: Types.ObjectId;
  clientId: Types.ObjectId;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: Date | null;
  failureReason?: string;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    stripeCheckoutSessionId: { type: String, index: true, sparse: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, lowercase: true },
    status: { type: String, enum: ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'], default: 'PENDING', index: true },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
