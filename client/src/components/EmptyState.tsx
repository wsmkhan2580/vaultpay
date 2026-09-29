import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-10 h-10 mx-auto mb-4 rounded-full border border-line flex items-center justify-center text-ink-700/40">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="font-display text-base font-semibold text-ink mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-700/60 max-w-sm mx-auto mb-4">{description}</p>}
      {action}
    </div>
  );
}
