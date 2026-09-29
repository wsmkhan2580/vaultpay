import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/Invoice';
import { IPayment } from '../models/Payment';
import { IClient } from '../models/Client';

interface ReceiptPdfInput {
  invoice: IInvoice;
  payment: IPayment;
  client: IClient;
  receiptNumber: string;
}

const BRAND_INK = '#0F1A2B';
const BRAND_ACCENT = '#2E6F5E';
const BRAND_MUTED = '#6B7280';

export function generateReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  const { invoice, payment, client, receiptNumber } = input;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fillColor(BRAND_INK).fontSize(20).font('Helvetica-Bold').text('VaultPay Financial Core', { continued: false });
    doc.fontSize(10).font('Helvetica').fillColor(BRAND_MUTED).text('Operated on behalf of Nexus Corporate Services');
    doc.moveDown(1.2);

    doc
      .fillColor(BRAND_ACCENT)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('PAYMENT RECEIPT', { align: 'right' });
    doc.fillColor(BRAND_MUTED).fontSize(10).font('Helvetica').text(`Receipt #: ${receiptNumber}`, { align: 'right' });
    doc.text(`Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
      align: 'right',
    });

    doc.moveDown(1.5);
    doc.strokeColor('#E2E5EA').lineWidth(1).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
    doc.moveDown(1);

    // Bill-to / invoice meta
    const topY = doc.y;
    doc.fillColor(BRAND_INK).fontSize(11).font('Helvetica-Bold').text('Billed To', 56, topY);
    doc.font('Helvetica').fontSize(10).fillColor(BRAND_MUTED);
    doc.text(client.companyName, 56, doc.y + 2);
    doc.text(client.contactEmail);

    doc.fillColor(BRAND_INK).fontSize(11).font('Helvetica-Bold').text('Invoice', 320, topY);
    doc.font('Helvetica').fontSize(10).fillColor(BRAND_MUTED);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 320, topY + 16);
    doc.text(`Due: ${invoice.dueDate.toLocaleDateString('en-US')}`, 320);
    doc.text(`Transaction ID: ${payment.stripePaymentIntentId || payment._id.toString()}`, 320);

    doc.moveDown(3);

    // Line items table
    const tableTop = doc.y + 10;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND_INK);
    doc.text('Description', 56, tableTop);
    doc.text('Qty', 340, tableTop, { width: 50, align: 'right' });
    doc.text('Unit Price', 390, tableTop, { width: 70, align: 'right' });
    doc.text('Amount', 470, tableTop, { width: 69, align: 'right' });
    doc.moveTo(56, tableTop + 16).lineTo(539, tableTop + 16).strokeColor('#E2E5EA').stroke();

    let rowY = tableTop + 24;
    doc.font('Helvetica').fontSize(10).fillColor(BRAND_MUTED);
    const items = invoice.items.length
      ? invoice.items
      : [{ description: invoice.description || 'Services rendered', quantity: 1, unitPrice: invoice.amount }];

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice;
      doc.text(item.description, 56, rowY, { width: 270 });
      doc.text(String(item.quantity), 340, rowY, { width: 50, align: 'right' });
      doc.text(formatCurrency(item.unitPrice, invoice.currency), 390, rowY, { width: 70, align: 'right' });
      doc.text(formatCurrency(lineTotal, invoice.currency), 470, rowY, { width: 69, align: 'right' });
      rowY += 20;
    }

    doc.moveTo(56, rowY + 4).lineTo(539, rowY + 4).strokeColor('#E2E5EA').stroke();

    doc.font('Helvetica-Bold').fontSize(12).fillColor(BRAND_INK);
    doc.text('Total Paid', 340, rowY + 16, { width: 120, align: 'right' });
    doc.text(formatCurrency(payment.amount, payment.currency), 470, rowY + 16, { width: 69, align: 'right' });

    // PAID stamp
    doc.save();
    doc.rotate(-12, { origin: [470, rowY + 70] });
    doc.font('Helvetica-Bold').fontSize(28).fillColor(BRAND_ACCENT).opacity(0.85);
    doc.text('PAID', 410, rowY + 55);
    doc.restore().opacity(1);

    doc.moveDown(6);
    doc.font('Helvetica').fontSize(9).fillColor(BRAND_MUTED);
    doc.text(
      `Payment date: ${(payment.paidAt || new Date()).toLocaleString('en-US')} · This receipt confirms a Stripe-verified payment and was generated automatically. For questions, contact billing@nexuscorporateservices.com.`,
      56,
      doc.y + 30,
      { width: 483 }
    );

    doc.end();
  });
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}
