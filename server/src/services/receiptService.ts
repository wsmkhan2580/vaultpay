import { Receipt } from '../models/Receipt';
import { Invoice, IInvoice } from '../models/Invoice';
import { Payment, IPayment } from '../models/Payment';
import { Client, IClient } from '../models/Client';
import { generateReceiptPdf } from './pdfService';
import { uploadReceiptPdf, getSignedDownloadUrl } from './storageService';
import { sendReceiptEmail } from './emailService';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './auditService';

function buildReceiptNumber(invoice: IInvoice): string {
  return `RCPT-${invoice.invoiceNumber.replace('VP-', '')}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Generates and stores the PDF receipt for a successful payment, then emails
 * it. Called only from the webhook flow, after the Stripe signature has been
 * verified and the payment/invoice have been atomically finalized.
 */
export async function generateAndDeliverReceipt(invoice: IInvoice, payment: IPayment, client: IClient): Promise<void> {
  const existing = await Receipt.findOne({ paymentId: payment._id });
  if (existing) return; // idempotent — a receipt already exists for this payment

  const receiptNumber = buildReceiptNumber(invoice);
  const pdfBuffer = await generateReceiptPdf({ invoice, payment, client, receiptNumber });

  const storageKey = `receipts/${client._id.toString()}/${receiptNumber}.pdf`;
  const upload = await uploadReceiptPdf(pdfBuffer, storageKey);

  const receipt = await Receipt.create({
    invoiceId: invoice._id,
    paymentId: payment._id,
    clientId: client._id,
    storageKey: upload.storageKey,
    storageProvider: upload.provider,
    receiptNumber,
    generatedAt: new Date(),
  });

  await recordAudit({
    actor: null,
    action: 'RECEIPT_GENERATED',
    resource: 'Receipt',
    resourceId: receipt._id.toString(),
    metadata: { invoiceId: invoice._id.toString(), paymentId: payment._id.toString() },
  });

  await sendReceiptEmail(client, invoice, receiptNumber, pdfBuffer);
  receipt.emailSentAt = new Date();
  await receipt.save();
}

/** IDOR-safe: only returns a receipt that belongs to the requesting client. */
export async function getReceiptForClient(receiptId: string, clientId: string) {
  const receipt = await Receipt.findOne({ _id: receiptId, clientId });
  if (!receipt) throw ApiError.notFound('Receipt not found');
  return receipt;
}

export async function getReceiptForAdmin(receiptId: string) {
  const receipt = await Receipt.findById(receiptId);
  if (!receipt) throw ApiError.notFound('Receipt not found');
  return receipt;
}

export async function listReceiptsForInvoiceClient(invoiceId: string, clientId: string) {
  // Ownership check on the invoice first, then fetch its receipts.
  const invoice = await Invoice.findOne({ _id: invoiceId, clientId });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return Receipt.find({ invoiceId });
}

export function signedUrlForReceipt(
  receipt: { storageKey: string; storageProvider: 'S3' | 'LOCAL' },
  baseUrl?: string
): string {
  return getSignedDownloadUrl(receipt.storageKey, receipt.storageProvider, 300, baseUrl);
}

/**
 * Rebuilds the receipt PDF on demand from the database records instead of
 * reading a stored file. Works on hosts with ephemeral disks (e.g. Render
 * free tier) and needs no S3. Callers must have already authorized access.
 */
export async function renderReceiptPdf(receipt: {
  invoiceId: unknown;
  paymentId: unknown;
  clientId: unknown;
  receiptNumber: string;
}): Promise<Buffer> {
  const [invoice, payment, client] = await Promise.all([
    Invoice.findById(receipt.invoiceId),
    Payment.findById(receipt.paymentId),
    Client.findById(receipt.clientId),
  ]);
  if (!invoice || !payment || !client) throw ApiError.notFound('Receipt data not found');
  return generateReceiptPdf({ invoice, payment, client, receiptNumber: receipt.receiptNumber });
}
