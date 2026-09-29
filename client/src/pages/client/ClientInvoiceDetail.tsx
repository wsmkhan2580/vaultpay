import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { invoiceApi, paymentApi, receiptApi } from '../../services/resources';
import type { Invoice, Receipt } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';
import { extractErrorMessage } from '../../services/api';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 10;

export default function ClientInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paymentFlag = searchParams.get('payment');

  // silent = true refreshes in the background without showing the spinner
  const load = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
      try {
        const invoiceRes = await invoiceApi.getMine(id);
        setInvoice(invoiceRes.data.data);
        const receiptRes = await receiptApi
          .listForInvoice(id)
          .catch(() => ({ data: { data: [] as Receipt[] } }));
        setReceipts(receiptRes.data.data);
      } catch {
        // keep whatever is already on screen; the "not found" state handles first-load failures
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  // After returning from Stripe Checkout, the invoice is finalized by a webhook
  // a few seconds later. Poll quietly until it flips to PAID.
  const waitingForWebhook = paymentFlag === 'success' && !!invoice && invoice.status !== 'PAID';
  useEffect(() => {
    if (!waitingForWebhook) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      load(true);
      if (attempts >= POLL_MAX_ATTEMPTS) clearInterval(timer);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [waitingForWebhook, load]);

  async function handlePay() {
    if (!id) return;
    setError(null);
    setPaying(true);
    try {
      const res = await paymentApi.checkout(id);
      window.location.href = res.data.data.checkoutUrl;
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not start checkout. Please try again.'));
      setPaying(false);
    }
  }

  async function handleDownloadReceipt(receiptId: string, receiptNumber: string) {
    setError(null);
    try {
      // The PDF is fetched through the authenticated API (login token attached)
      // and saved by the browser directly — no separate link, so it can't
      // land on a wrong domain or 404 page.
      const res = await receiptApi.downloadMine(receiptId);
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not download the receipt. Please try again.'));
    }
  }

  if (loading) return <LoadingSpinner label="Loading invoice…" />;
  if (!invoice) return <p className="text-sm text-ink-700/60">Invoice not found.</p>;

  const canPay = invoice.status === 'PENDING' || invoice.status === 'OVERDUE';

  return (
    <div className="max-w-2xl">
      <Link to="/client" className="text-xs text-ink-700/50 hover:text-ink mb-4 inline-block">
        ← Back to dashboard
      </Link>

      {paymentFlag === 'success' && invoice.status !== 'PAID' && (
        <div className="mb-4 text-sm bg-vault-amber/10 border border-vault-amber/25 text-vault-amber rounded-md px-4 py-3">
          Payment received by Stripe — we're confirming it now. This page will update automatically once our
          webhook finalizes the invoice (usually within a few seconds). Refresh if it doesn't update shortly.
        </div>
      )}
      {paymentFlag === 'cancelled' && (
        <div className="mb-4 text-sm bg-ink-700/5 border border-ink-700/10 text-ink-700/70 rounded-md px-4 py-3">
          Checkout was cancelled. No payment was made.
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-ink-700/60 mt-1">Due {formatDate(invoice.dueDate)}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="mb-6">
          <div className="text-xs text-ink-700/50 mb-1">Amount due</div>
          <div className="font-display text-3xl font-semibold text-ink">{formatCurrency(invoice.amount, invoice.currency)}</div>
        </div>

        {invoice.description && <p className="text-sm text-ink-700/70 mb-6">{invoice.description}</p>}

        <div className="border border-line rounded-md overflow-hidden mb-6">
          {invoice.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-line last:border-0">
              <span className="text-ink">{item.description}</span>
              <span className="text-ink-700/60">
                {item.quantity} × {formatCurrency(item.unitPrice, invoice.currency)}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div role="alert" className="mb-4 text-sm text-vault-rust bg-vault-rust/5 border border-vault-rust/20 rounded-md px-3 py-2.5">
            {error}
          </div>
        )}

        {canPay && (
          <button onClick={handlePay} disabled={paying} className="btn-primary w-full sm:w-auto">
            {paying ? 'Redirecting to secure checkout…' : `Pay ${formatCurrency(invoice.amount, invoice.currency)}`}
          </button>
        )}

        {invoice.status === 'PAID' && receipts.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-ink-700/50 mb-2">Receipts</h2>
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
          </div>
        )}
      </div>
    </div>
  );
}
