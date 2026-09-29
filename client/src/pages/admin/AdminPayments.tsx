import { useEffect, useState } from 'react';
import { paymentApi } from '../../services/resources';
import type { Payment } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentApi
      .listAdmin({})
      .then((res) => setPayments(res.data.data.items))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Payments</h1>
        <p className="text-sm text-ink-700/60 mt-1">Every payment attempt, verified via Stripe webhook.</p>
      </header>

      {loading ? (
        <LoadingSpinner label="Loading payments…" />
      ) : payments.length === 0 ? (
        <div className="card">
          <EmptyState title="No payments yet" description="Payments will appear here once clients start paying invoices." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-700/50">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Client</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Reference</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">
                    {typeof p.invoiceId === 'object' ? p.invoiceId.invoiceNumber : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-ink-700/60 hidden sm:table-cell">
                    {typeof p.clientId === 'object' ? p.clientId.companyName : '—'}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-ink">{formatCurrency(p.amount, p.currency)}</td>
                  <td className="px-5 py-3.5 text-ink-700/50 hidden md:table-cell font-mono text-xs">
                    {p.stripePaymentIntentId || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-ink-700/60 hidden sm:table-cell">
                    {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
