import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { invoiceApi, receiptApi } from '../../services/resources';
import type { Invoice, Receipt } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';
import { extractErrorMessage } from '../../services/api';

export default function AdminInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const loadReceipts = useCallback(() => {
    if (!id) return;
    receiptApi
      .listForInvoiceAdmin(id)
      .then((res) => setReceipts(res.data.data))
      .catch(() => setReceipts([]));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    invoiceApi
      .getAdmin(id)
      .then((res) => setInvoice(res.data.data))
      .finally(() => setLoading(false));
    loadReceipts();
  }, [id, loadReceipts]);

  async function handleGenerateReceipt() {
    if (!id) return;
    setReceiptError(null);
    setGenerating(true);
    try {
      await receiptApi.generateForInvoiceAdmin(id);
      loadReceipts();
    } catch (err) {
      // Surfaced directly from the server — this is the real reason (bad
      // SMTP config, PDF generation error, etc.), not a generic message.
      setReceiptError(extractErrorMessage(err, 'Could not generate the receipt.'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadReceipt(receiptId: string, receiptNumber: string) {
    setReceiptError(null);
    try {
      const res = await receiptApi.downloadAdmin(receiptId);
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setReceiptError(extractErrorMessage(err, 'Could not download the receipt.'));
    }
  }

  if (loading) return <LoadingSpinner label="Loading invoice…" />;
  if (!invoice) return <p className="text-sm text-ink-700/60">Invoice not found.</p>;

  const client = typeof invoice.clientId === 'object' ? invoice.clientId : null;

  return (
    <div className="max-w-2xl">
      <Link to="/admin/invoices" className="text-xs text-ink-700/50 hover:text-ink mb-4 inline-block">
        ← Back to invoices
      </Link>

      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-ink-700/60 mt-1">{client?.companyName || '—'}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <dl className="grid grid-cols-2 gap-y-4 text-sm mb-6">
          <div>
            <dt className="text-ink-700/50 text-xs mb-0.5">Amount</dt>
            <dd className="font-display text-lg font-semibold text-ink">{formatCurrency(invoice.amount, invoice.currency)}</dd>
          </div>
          <div>
            <dt className="text-ink-700/50 text-xs mb-0.5">Due date</dt>
            <dd className="text-ink">{formatDate(invoice.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-ink-700/50 text-xs mb-0.5">Client email</dt>
            <dd className="text-ink">{client?.contactEmail || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-700/50 text-xs mb-0.5">Paid on</dt>
            <dd className="text-ink">{invoice.paidAt ? formatDate(invoice.paidAt) : '—'}</dd>
          </div>
        </dl>

        {invoice.description && (
          <div className="mb-6">
            <dt className="text-ink-700/50 text-xs mb-1">Description</dt>
            <dd className="text-sm text-ink">{invoice.description}</dd>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xs font-medium text-ink-700/50 mb-2">Line items</h2>
          <div className="border border-line rounded-md overflow-hidden">
            {invoice.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-line last:border-0"
              >
                <span className="text-ink">{item.description}</span>
                <span className="text-ink-700/60">
                  {item.quantity} × {formatCurrency(item.unitPrice, invoice.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {invoice.status === 'PAID' && (
          <div>
            <h2 className="text-xs font-medium text-ink-700/50 mb-2">Receipt</h2>

            {receiptError && (
              <div role="alert" className="mb-3 text-sm text-vault-rust bg-vault-rust/5 border border-vault-rust/20 rounded-md px-3 py-2.5">
                {receiptError}
              </div>
            )}

            {receipts.length > 0 ? (
              <div className="space-y-2">
                {receipts.map((r) => (
                  <button
                    key={r._id}
                    onClick={() => handleDownloadReceipt(r._id, r.receiptNumber)}
                    className="btn-secondary w-full sm:w-auto justify-between"
                  >
                    <span>{r.receiptNumber}</span>
                    <span className="text-ink-700/40">Download →</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-ink-700/60 mb-2">No receipt exists for this invoice yet.</p>
                <button onClick={handleGenerateReceipt} disabled={generating} className="btn-primary">
                  {generating ? 'Generating…' : 'Generate receipt'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
