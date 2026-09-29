import { useEffect, useState } from 'react';
import { adminApi } from '../../services/resources';
import type { AdminOverview } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .overview()
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard…" />;
  if (!data) return null;

  const maxTrend = Math.max(...data.monthlyTrend.map((m) => m.total), 1);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Overview</h1>
        <p className="text-sm text-ink-700/60 mt-1">Billing performance across all Nexus clients.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total revenue" value={formatCurrency(data.totalRevenue)} accent />
        <StatCard label="Pending amount" value={formatCurrency(data.pendingAmount)} />
        <StatCard label="Paid invoices" value={String(data.paidInvoices)} />
        <StatCard label="Overdue" value={String(data.overdueInvoices)} warn={data.overdueInvoices > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-display text-sm font-semibold text-ink mb-5">Monthly revenue trend</h2>
          {data.monthlyTrend.length === 0 ? (
            <p className="text-sm text-ink-700/50 py-8 text-center">No payments recorded yet.</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {data.monthlyTrend.map((m) => (
                <div key={`${m._id.year}-${m._id.month}`} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center" style={{ height: 128 }}>
                    <div
                      className="w-full max-w-[28px] bg-vault-teal rounded-t-sm"
                      style={{ height: `${Math.max((m.total / maxTrend) * 100, 4)}%` }}
                      title={formatCurrency(m.total)}
                    />
                  </div>
                  <span className="text-[11px] text-ink-700/50">{MONTHS[m._id.month - 1]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display text-sm font-semibold text-ink mb-5">Invoice breakdown</h2>
          <div className="space-y-3">
            <BreakdownRow label="Pending" value={data.pendingInvoices} total={data.totalInvoices} color="bg-vault-amber" />
            <BreakdownRow label="Paid" value={data.paidInvoices} total={data.totalInvoices} color="bg-vault-teal" />
            <BreakdownRow label="Overdue" value={data.overdueInvoices} total={data.totalInvoices} color="bg-vault-rust" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-xs text-ink-700/50 mb-2">{label}</div>
      <div
        className={`font-display text-2xl font-semibold ${
          warn ? 'text-vault-rust' : accent ? 'text-vault-tealDark' : 'text-ink'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-ink-700/70">{label}</span>
        <span className="font-medium text-ink">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-paper-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
