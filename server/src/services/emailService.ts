import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { IInvoice } from '../models/Invoice';
import { IClient } from '../models/Client';
import { IPayment } from '../models/Payment';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword) {
    logger.warn('SMTP not configured — emails will be logged instead of sent (development only)');
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPassword },
    });
  }
  return transporter;
}

function wrapTemplate(title: string, bodyHtml: string): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; background:#F3F5F7; padding:32px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E5E8EC;">
      <div style="background:#0F1A2B;padding:20px 28px;">
        <span style="color:#ffffff;font-size:16px;font-weight:600;letter-spacing:0.2px;">VaultPay Financial Core</span>
      </div>
      <div style="padding:28px;color:#1F2937;">
        <h1 style="font-size:18px;margin:0 0 16px;color:#0F1A2B;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:16px 28px;background:#F9FAFB;color:#6B7280;font-size:12px;">
        Nexus Corporate Services · This is an automated message from VaultPay.
      </div>
    </div>
  </div>`;
}

async function sendMail(to: string, subject: string, html: string, attachment?: { filename: string; content: Buffer }) {
  const t = getTransporter();
  if (!t) {
    logger.info('Email suppressed (SMTP not configured)', { to, subject });
    return;
  }
  try {
    await t.sendMail({
      from: env.smtpFrom,
      to,
      subject,
      html,
      attachments: attachment ? [{ filename: attachment.filename, content: attachment.content }] : undefined,
    });
  } catch (err) {
    // Email failures must never crash the calling business flow (e.g. a payment
    // finalizing) — log and move on; the receipt/invoice remains retrievable in-app.
    logger.error('Failed to send email', { to, subject, error: err instanceof Error ? err.message : 'unknown' });
  }
}

export async function sendInvoiceCreatedEmail(client: IClient, invoice: IInvoice): Promise<void> {
  const link = `${env.clientUrl}/invoices/${invoice._id.toString()}`;
  const html = wrapTemplate(
    'A new invoice is ready',
    `<p>Hello ${escapeHtml(client.companyName)},</p>
     <p>Invoice <strong>${escapeHtml(invoice.invoiceNumber)}</strong> for
     <strong>${formatCurrency(invoice.amount, invoice.currency)}</strong> has been issued, due
     ${invoice.dueDate.toLocaleDateString('en-US')}.</p>
     <p><a href="${link}" style="display:inline-block;background:#2E6F5E;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">View invoice</a></p>`
  );
  await sendMail(client.contactEmail, `New invoice ${invoice.invoiceNumber} from Nexus Corporate Services`, html);
}

export async function sendPaymentConfirmationEmail(client: IClient, invoice: IInvoice, payment: IPayment): Promise<void> {
  const html = wrapTemplate(
    'Payment received',
    `<p>Hello ${escapeHtml(client.companyName)},</p>
     <p>We've received your payment of <strong>${formatCurrency(payment.amount, payment.currency)}</strong>
     for invoice <strong>${escapeHtml(invoice.invoiceNumber)}</strong>.</p>
     <p>Payment date: ${(payment.paidAt || new Date()).toLocaleString('en-US')}<br/>
     Reference: ${payment.stripePaymentIntentId || payment._id.toString()}</p>`
  );
  await sendMail(client.contactEmail, `Payment confirmed for invoice ${invoice.invoiceNumber}`, html);
}

export async function sendReceiptEmail(
  client: IClient,
  invoice: IInvoice,
  receiptNumber: string,
  pdfBuffer: Buffer
): Promise<void> {
  const html = wrapTemplate(
    'Your receipt is attached',
    `<p>Hello ${escapeHtml(client.companyName)},</p>
     <p>Attached is your official receipt <strong>${escapeHtml(receiptNumber)}</strong> for invoice
     <strong>${escapeHtml(invoice.invoiceNumber)}</strong>. You can also view it anytime from your VaultPay portal.</p>`
  );
  await sendMail(client.contactEmail, `Receipt ${receiptNumber}`, html, {
    filename: `${receiptNumber}.pdf`,
    content: pdfBuffer,
  });
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
