import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoiceApi } from '../../services/resources';
import { useAuth } from '../../context/AuthContext';
import type { Invoice } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoiceApi
      .listMine()
      .then((res) => setInvoices(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  const outstanding = invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');
  const outstandingTotal = outstanding.reduce((sum, i) => sum + i.amount, 0);

  if (loading) return <LoadingSpinner label="Loading your dashboard…" />;

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
        <p className="text-sm text-ink-700/60 mt-1">Here's where things stand on your account.</p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-xs text-ink-700/50 mb-2">Outstanding balance</div>
          <div className="font-display text-2xl font-semibold text-vault-rust">{formatCurrency(outstandingTotal)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-700/50 mb-2">Open invoices</div>
          <div className="font-display text-2xl font-semibold text-ink">{outstanding.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-700/50 mb-2">Paid to date</div>
          <div className="font-display text-2xl font-semibold text-ink">{invoices.filter((i) => i.status === 'PAID').length}</div>
        </div>
      </div>

      <h2 className="font-display text-sm font-semibold text-ink mb-3">Your invoices</h2>

      {invoices.length === 0 ? (
        <div className="card">
          <EmptyState title="No invoices yet" description="Invoices from Nexus Corporate Services will appear here." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-line">
            {invoices.map((inv) => (
              <Link
                key={inv._id}
                to={`/client/invoices/${inv._id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-paper-muted/50"
              >
                <div>
                  <div className="font-medium text-ink text-sm">{inv.invoiceNumber}</div>
                  <div className="text-xs text-ink-700/50 mt-0.5">Due {formatDate(inv.dueDate)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-ink text-sm">{formatCurrency(inv.amount, inv.currency)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
