interface StatusBadgeProps {
  status: string;
}

const STYLES: Record<string, string> = {
  PAID: 'bg-vault-teal/10 text-vault-tealDark border-vault-teal/25',
  SUCCEEDED: 'bg-vault-teal/10 text-vault-tealDark border-vault-teal/25',
  ACTIVE: 'bg-vault-teal/10 text-vault-tealDark border-vault-teal/25',
  PENDING: 'bg-vault-amber/10 text-vault-amber border-vault-amber/25',
  DRAFT: 'bg-ink-700/5 text-ink-700/60 border-ink-700/10',
  OVERDUE: 'bg-vault-rust/10 text-vault-rust border-vault-rust/25',
  FAILED: 'bg-vault-rust/10 text-vault-rust border-vault-rust/25',
  CANCELLED: 'bg-ink-700/5 text-ink-700/50 border-ink-700/10',
  INACTIVE: 'bg-ink-700/5 text-ink-700/50 border-ink-700/10',
  SUSPENDED: 'bg-vault-rust/10 text-vault-rust border-vault-rust/25',
};

const LABELS: Record<string, string> = {
  PAID: 'Paid',
  SUCCEEDED: 'Succeeded',
  ACTIVE: 'Active',
  PENDING: 'Pending',
  DRAFT: 'Draft',
  OVERDUE: 'Overdue',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STYLES[status] || 'bg-ink-700/5 text-ink-700/60 border-ink-700/10';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LABELS[status] || status}
    </span>
  );
}
