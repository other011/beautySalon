import { CalendarDays, Clock } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import type { Reservation } from '../types';
import { formatDateLong, formatMoney, formatTime } from '../utils/format';
import { StatusBadge } from './ui/Badge';
import { Button, ButtonLink } from './ui/Button';

interface Props {
  reservation: Reservation;
  onCancel?: (r: Reservation) => void;
}

export function ReservationCard({ reservation: r, onCancel }: Props) {
  const { settings } = useSettings();
  return (
    <article className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" aria-label={`Rezervare ${r.serviceName}`}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-xl font-semibold">{r.serviceName}</h3>
          <StatusBadge status={r.status} />
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-gold-500" aria-hidden /> {formatDateLong(r.startDateTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-gold-500" aria-hidden /> {formatTime(r.startDateTime)} – {formatTime(r.endDateTime)}
          </span>
          <span className="font-medium text-ink-800">{formatMoney(r.price, settings.currency)}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink to={`/rezervari/${r.id}`} variant="secondary" size="sm">
          Detalii
        </ButtonLink>
        {r.canModify && (
          <>
            <ButtonLink to={`/rezervari/${r.id}/modifica`} variant="secondary" size="sm">
              Modifică
            </ButtonLink>
            {onCancel && (
              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => onCancel(r)}>
                Anulează
              </Button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
