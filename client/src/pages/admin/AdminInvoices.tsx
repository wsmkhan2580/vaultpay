import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoiceApi } from '../../services/resources';
import type { Invoice, InvoiceStatus } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';

const STATUS_OPTIONS: (InvoiceStatus | 'ALL')[] = ['ALL', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'DRAFT'];

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    invoiceApi
      .listAdmin({ status: status === 'ALL' ? undefined : status, search: search || undefined })
      .then((res) => {
        setInvoices(res.data.data.items);
        setTotal(res.data.data.total);
      })
      .finally(() => setLoading(false));
  }, [status, search]);

  return (
    <div>
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Invoices</h1>
          <p className="text-sm text-ink-700/60 mt-1">{total} total</p>
        </div>
        <Link to="/admin/invoices/new" className="btn-primary shrink-0">
          New invoice
        </Link>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          className="input sm:max-w-xs"
          placeholder="Search invoice number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                status === s ? 'bg-ink text-white border-ink' : 'bg-white text-ink-700/60 border-line hover:bg-paper-muted'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading invoices…" />
      ) : invoices.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No invoices found"
            description="Try adjusting your filters, or create a new invoice for a client."
            action={
              <Link to="/admin/invoices/new" className="btn-primary">
                New invoice
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-700/50">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-b border-line last:border-0 hover:bg-paper-muted/50">
                  <td className="px-5 py-3.5">
                    <Link to={`/admin/invoices/${inv._id}`} className="font-medium text-ink hover:text-vault-teal">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink-700/70">
                    {typeof inv.clientId === 'object' ? inv.clientId.companyName : '—'}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-ink">{formatCurrency(inv.amount, inv.currency)}</td>
                  <td className="px-5 py-3.5 text-ink-700/60">{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-line">
            {invoices.map((inv) => (
              <Link to={`/admin/invoices/${inv._id}`} key={inv._id} className="block px-5 py-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-ink text-sm">{inv.invoiceNumber}</span>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="flex items-center justify-between text-sm text-ink-700/60">
                  <span>{typeof inv.clientId === 'object' ? inv.clientId.companyName : '—'}</span>
                  <span className="font-medium text-ink">{formatCurrency(inv.amount, inv.currency)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
