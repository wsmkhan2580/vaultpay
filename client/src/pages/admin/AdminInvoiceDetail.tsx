import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { invoiceApi } from '../../services/resources';
import type { Invoice } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';

export default function AdminInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    invoiceApi
      .getAdmin(id)
      .then((res) => setInvoice(res.data.data))
      .finally(() => setLoading(false));
  }, [id]);

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

        <div>
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
      </div>
    </div>
  );
}
