import type { ReactNode } from "react";

interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = "Loading…" }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-light">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-transparent" />
      <p className="font-display text-sm font-semibold">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center">
      <p className="font-display text-base font-bold">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-light">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-danger bg-danger-light px-4 py-3 text-sm text-ink">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-secondary btn-sm">
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card animate-pulse space-y-3 p-5">
      <div className="h-4 w-1/3 rounded-full bg-ink/10" />
      <div className="h-8 w-1/2 rounded-full bg-ink/10" />
      <div className="h-3 w-2/3 rounded-full bg-ink/10" />
    </div>
  );
}
