import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CancelReservationDialog } from '../../components/CancelReservationDialog';
import { StatusBadge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/States';
import { useSettings } from '../../hooks/useSettings';
import { reservationsApi } from '../../services/endpoints';
import { formatDateLong, formatDateTime, formatMoney, formatTime } from '../../utils/format';

export default function ReservationDetail() {
  const { id } = useParams();
  const created = (useLocation().state as { created?: boolean } | null)?.created;
  const { settings } = useSettings();
  const query = useQuery({ queryKey: ['reservation', Number(id)], queryFn: () => reservationsApi.get(Number(id)) });
  const [cancelling, setCancelling] = useState(false);
  const r = query.data;

  return (
    <div className="container-page max-w-3xl py-12">
      <Link to="/rezervarile-mele" className="mb-6 inline-block text-sm text-ink-500 hover:text-gold-600">
        ← Rezervările mele
      </Link>

      {created && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Rezervarea ta a fost creată cu succes.</p>
            <p className="text-sm">Te așteptăm în salon! O regăsești oricând în „Rezervările mele”.</p>
          </div>
        </div>
      )}

      <QueryState query={query}>
        {r && (
          <div className="card space-y-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-display text-3xl font-semibold">{r.serviceName}</h1>
              <StatusBadge status={r.status} />
            </div>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Item label="Data" value={formatDateLong(r.startDateTime)} />
              <Item label="Ora" value={`${formatTime(r.startDateTime)} – ${formatTime(r.endDateTime)}`} />
              <Item label="Durată" value={`${r.durationMinutes} min`} />
              <Item label="Preț" value={formatMoney(r.price, settings.currency)} />
              <Item label="Creată la" value={formatDateTime(r.createdAt)} />
              <Item label="Observații" value={r.notes || '—'} />
            </dl>
            {r.canModify ? (
              <div className="flex flex-wrap gap-3 border-t border-sand-200 pt-6">
                <ButtonLink to={`/rezervari/${r.id}/modifica`} variant="secondary">
                  Modifică rezervarea
                </ButtonLink>
                <Button variant="danger" onClick={() => setCancelling(true)}>
                  Anulează rezervarea
                </Button>
              </div>
            ) : (
              (r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                <p className="border-t border-sand-200 pt-6 text-sm text-ink-500">
                  Rezervările pot fi anulate sau modificate cu minimum {settings.cancellationHours} ore înainte. Pentru ajutor, sună-ne la {settings.phone}.
                </p>
              )
            )}
          </div>
        )}
      </QueryState>

      <CancelReservationDialog reservation={cancelling ? (r ?? null) : null} onClose={() => setCancelling(false)} />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-1 text-ink-800">{value}</dd>
    </div>
  );
}
