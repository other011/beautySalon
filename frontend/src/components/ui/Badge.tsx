import type { ReservationStatus } from '../../types';
import { STATUS_LABEL } from '../../utils/format';

const TONE: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  COMPLETED: 'bg-sand-100 text-ink-700 ring-sand-300',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
  NO_SHOW: 'bg-purple-50 text-purple-700 ring-purple-200',
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'gold' | 'green' | 'red' }) {
  const tones = {
    neutral: 'bg-sand-100 text-ink-600',
    gold: 'bg-gold-100 text-gold-600',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
