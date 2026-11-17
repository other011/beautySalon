import { CheckCircle2 } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ButtonLink } from '../components/ui/Button';
import { useSettings } from '../hooks/useSettings';
import type { GuestReservationResult } from '../types';
import { formatDateLong, formatMoney, formatTime } from '../utils/format';

/** Shown after a booking made without an account; the data only lives in the navigation state. */
export default function GuestConfirmation() {
  const state = useLocation().state as { result?: GuestReservationResult; name?: string } | null;
  const { settings } = useSettings();
  const r = state?.result;
  if (!r) return <Navigate to="/rezervare" replace />;

  return (
    <div className="container-page max-w-2xl py-14">
      <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        <div>
          <p className="font-display text-2xl font-semibold">{state?.name ? `Mulțumim, ${state.name}!` : 'Mulțumim!'}</p>
          <p className="text-sm">Rezervarea ta a fost creată cu succes. {r.status === 'PENDING' && 'O vom confirma în cel mai scurt timp.'}</p>
        </div>
      </div>

      <div className="card space-y-5 p-6 sm:p-8">
        <h1 className="font-display text-3xl font-semibold">{r.serviceName}</h1>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Item label="Data" value={formatDateLong(r.startDateTime)} />
          <Item label="Ora" value={`${formatTime(r.startDateTime)} – ${formatTime(r.endDateTime)}`} />
          <Item label="Durată" value={`${r.durationMinutes} min`} />
          <Item label="Preț" value={formatMoney(r.price, settings.currency)} />
        </dl>
        <p className="border-t border-sand-200 pt-5 text-sm text-ink-600">
          Fiindcă nu ai cont, rezervarea nu poate fi modificată online. Dacă îți schimbi planurile, sună-ne la <a className="font-medium text-gold-600" href={`tel:${settings.phone.replace(/\s/g, '')}`}>{settings.phone}</a>.
          Cu un cont îți poți vedea și gestiona rezervările oricând —{' '}
          <Link to="/inregistrare" className="font-medium text-gold-600 underline">
            creează unul
          </Link>{' '}
          folosind același număr de telefon.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/">Înapoi acasă</ButtonLink>
          <ButtonLink to="/rezervare" variant="secondary">
            Altă rezervare
          </ButtonLink>
        </div>
      </div>
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
