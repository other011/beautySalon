import { AlertCircle, CalendarX2, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';
import { friendlyError } from '../../utils/errors';
import { Button } from './Button';

export function Spinner({ label = 'Se încarcă…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-ink-500">
      <Loader2 className="h-5 w-5 animate-spin text-gold-500" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-6 py-10 text-center">
      <AlertCircle className="h-7 w-7 text-red-500" aria-hidden />
      <p className="max-w-md text-sm text-red-800">{friendlyError(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Încearcă din nou
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50/60 px-6 py-12 text-center">
      <CalendarX2 className="h-8 w-8 text-nude-400" aria-hidden />
      <p className="font-display text-xl font-semibold">{title}</p>
      {description && <p className="max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/** Renders loading / error states for a react-query result and the content otherwise. */
export function QueryState({ query, children, loadingLabel }: { query: QueryLike; children: ReactNode; loadingLabel?: string }) {
  if (query.isLoading) return <Spinner label={loadingLabel} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <>{children}</>;
}
