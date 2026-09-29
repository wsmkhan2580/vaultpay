import { Schema, model, Document, Types } from 'mongoose';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number; // stored in the smallest currency unit's major form, e.g. dollars
}

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  invoiceNumber: string;
  clientId: Types.ObjectId;
  amount: number; // authoritative total, in major currency units (e.g. USD dollars)
  currency: string; // ISO 4217, lowercase, e.g. "usd"
  description?: string;
  items: IInvoiceItem[];
  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, lowercase: true, default: 'usd', minlength: 3, maxlength: 3 },
    description: { type: String, trim: true, maxlength: 1000 },
    items: { type: [invoiceItemSchema], default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'PAID', 'CANCELLED', 'OVERDUE'],
      default: 'PENDING',
      index: true,
    },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });

// Server-side integrity check: the authoritative amount must equal the sum of
// line items whenever line items are provided. This runs at the DB layer so
// it can never be bypassed by a controller that forgets to check.
invoiceSchema.pre('validate', function (next) {
  if (this.items && this.items.length > 0) {
    const computed = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const rounded = Math.round(computed * 100) / 100;
    if (Math.abs(rounded - this.amount) > 0.01) {
      this.amount = rounded;
    }
  }
  next();
});

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);
