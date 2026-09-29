import { Schema, model } from 'mongoose';

interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = model<ICounter>('Counter', counterSchema);

/**
 * Atomically generates the next invoice number for the given year, e.g.
 * "VP-2026-000001". Uses findOneAndUpdate with $inc so concurrent invoice
 * creation requests can never collide on the same number, even without an
 * external lock.
 */
export async function nextInvoiceNumber(year: number = new Date().getFullYear()): Promise<string> {
  const key = `invoice-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const padded = String(counter.seq).padStart(6, '0');
  return `VP-${year}-${padded}`;
}
