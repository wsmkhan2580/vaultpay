import { Schema, model, Document, Types } from 'mongoose';

export type ClientStatus = 'ACTIVE' | 'INACTIVE';

export interface IClient extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyName: string;
  contactEmail: string;
  billingAddress?: string;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    billingAddress: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Client = model<IClient>('Client', clientSchema);
