import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actor: Types.ObjectId | null; // null for unauthenticated events e.g. failed login
  actorEmail?: string;
  action: string; // e.g. "LOGIN_SUCCESS", "INVOICE_CREATED", "PAYMENT_STATUS_CHANGED"
  resource: string; // e.g. "Invoice"
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  actor: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorEmail: { type: String },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  resourceId: { type: String, index: true },
  metadata: { type: Schema.Types.Mixed },
  ip: { type: String },
  timestamp: { type: Date, default: () => new Date(), index: true },
});

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
