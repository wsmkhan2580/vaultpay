interface LoadingSpinnerProps {
  full?: boolean;
  /** Contextual message shown under the spinner, e.g. "Loading invoices…".
   * Telling people what's happening (instead of a bare spinner) is what
   * makes a data refresh read as "loading" rather than "the page reloaded". */
  label?: string;
}

export function LoadingSpinner({ full = false, label }: LoadingSpinnerProps) {
  return (
    <div
      className={
        full
          ? 'min-h-screen flex flex-col items-center justify-center gap-3 bg-paper'
          : 'flex flex-col items-center justify-center gap-3 py-16'
      }
    >
      <div className="w-6 h-6 border-2 border-ink-700/15 border-t-vault-teal rounded-full animate-spin" />
      {label && <p className="text-sm text-ink-700/50">{label}</p>}
    </div>
  );
}

export default LoadingSpinner;
