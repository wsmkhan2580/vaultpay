import { Schema, model, Document, Types } from 'mongoose';

export interface IReceipt extends Document {
  _id: Types.ObjectId;
  invoiceId: Types.ObjectId;
  paymentId: Types.ObjectId;
  clientId: Types.ObjectId;
  // Storage key/path only — NEVER a public URL. Signed URLs are generated
  // on demand by storageService, scoped to the requesting user, short-lived.
  storageKey: string;
  storageProvider: 'S3' | 'LOCAL';
  receiptNumber: string;
  emailSentAt?: Date | null;
  generatedAt: Date;
}

const receiptSchema = new Schema<IReceipt>({
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  storageKey: { type: String, required: true },
  storageProvider: { type: String, enum: ['S3', 'LOCAL'], required: true },
  receiptNumber: { type: String, required: true, unique: true },
  emailSentAt: { type: Date, default: null },
  generatedAt: { type: Date, default: () => new Date() },
});

export const Receipt = model<IReceipt>('Receipt', receiptSchema);
