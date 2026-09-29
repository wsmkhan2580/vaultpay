import { Invoice, IInvoiceItem, InvoiceStatus } from '../models/Invoice';
import { Client } from '../models/Client';
import { ApiError } from '../utils/ApiError';
import { nextInvoiceNumber } from './invoiceNumberService';
import { recordAudit } from './auditService';
import { sendInvoiceCreatedEmail } from './emailService';

function computeAmount(items: IInvoiceItem[]): number {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return Math.round(total * 100) / 100;
}

export async function createInvoice(params: {
  actorId: string;
  clientId: string;
  currency: string;
  description?: string;
  items: IInvoiceItem[];
  dueDate: string;
}) {
  const client = await Client.findById(params.clientId);
  if (!client) throw ApiError.notFound('Client not found');
  if (client.status !== 'ACTIVE') throw ApiError.badRequest('Cannot invoice an inactive client');

  const amount = computeAmount(params.items);
  if (amount <= 0) throw ApiError.badRequest('Invoice amount must be greater than zero');

  const invoiceNumber = await nextInvoiceNumber();

  const invoice = await Invoice.create({
    invoiceNumber,
    clientId: client._id,
    amount,
    currency: params.currency.toLowerCase(),
    description: params.description,
    items: params.items,
    status: 'PENDING',
    dueDate: new Date(params.dueDate),
    createdBy: params.actorId,
  });

  await recordAudit({
    actor: params.actorId,
    action: 'INVOICE_CREATED',
    resource: 'Invoice',
    resourceId: invoice._id.toString(),
    metadata: { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount, clientId: client._id.toString() },
  });

  // Best-effort notification; failure to email must not fail invoice creation.
  sendInvoiceCreatedEmail(client, invoice).catch(() => undefined);

  return invoice;
}

/**
 * Admin listing — not scoped to a single client, but still goes through a
 * single query builder so filters stay consistent and injectable-looking
 * query params never reach Mongoose unsanitized (mongo-sanitize middleware
 * strips operator keys globally as defense in depth; this builder also only
 * ever assigns known, validated fields).
 */
export async function listInvoicesForAdmin(filters: {
  status?: InvoiceStatus;
  clientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.clientId) query.clientId = filters.clientId;
  if (filters.search) {
    query.$or = [
      { invoiceNumber: { $regex: escapeRegex(filters.search), $options: 'i' } },
      { description: { $regex: escapeRegex(filters.search), $options: 'i' } },
    ];
  }

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 && filters.limit <= 100 ? filters.limit : 20;

  const [items, total] = await Promise.all([
    Invoice.find(query)
      .populate('clientId', 'companyName contactEmail')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Invoice.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** IDOR-safe: only ever returns an invoice that belongs to the given client. */
export async function getInvoiceForClient(invoiceId: string, clientId: string) {
  const invoice = await Invoice.findOne({ _id: invoiceId, clientId });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
}

/** Admin path: existence-only lookup, role already enforced upstream. */
export async function getInvoiceForAdmin(invoiceId: string) {
  const invoice = await Invoice.findById(invoiceId).populate('clientId', 'companyName contactEmail');
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
}

export async function listInvoicesForClient(clientId: string, status?: InvoiceStatus) {
  const query: Record<string, unknown> = { clientId };
  if (status) query.status = status;
  return Invoice.find(query).sort({ createdAt: -1 });
}

export async function updateInvoice(
  invoiceId: string,
  actorId: string,
  updates: { description?: string; items?: IInvoiceItem[]; dueDate?: string; status?: InvoiceStatus }
) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw ApiError.notFound('Invoice not found');

  if (invoice.status === 'PAID') {
    throw ApiError.badRequest('A paid invoice cannot be modified');
  }

  if (updates.description !== undefined) invoice.description = updates.description;
  if (updates.items !== undefined) {
    invoice.items = updates.items;
    invoice.amount = computeAmount(updates.items);
  }
  if (updates.dueDate !== undefined) invoice.dueDate = new Date(updates.dueDate);
  if (updates.status !== undefined) invoice.status = updates.status;

  await invoice.save();

  await recordAudit({
    actor: actorId,
    action: 'INVOICE_UPDATED',
    resource: 'Invoice',
    resourceId: invoice._id.toString(),
    metadata: { updates: Object.keys(updates) },
  });

  return invoice;
}
