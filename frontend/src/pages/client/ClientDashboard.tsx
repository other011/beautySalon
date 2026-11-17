import { CalendarDays, Clock, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CancelReservationDialog } from '../../components/CancelReservationDialog';
import { PageHeader } from '../../components/PageHeader';
import { ReservationCard } from '../../components/ReservationCard';
import { StatusBadge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, QueryState } from '../../components/ui/States';
import { useAuth } from '../../hooks/useAuth';
import { useMyReservations } from '../../hooks/useMyReservations';
import { useSettings } from '../../hooks/useSettings';
import type { Reservation } from '../../types';
import { formatDateLong, formatMoney, formatTime } from '../../utils/format';

export default function ClientDashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const res = useMyReservations();
  const [toCancel, setToCancel] = useState<Reservation | null>(null);
  const next = res.upcoming[0];

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Contul meu"
        title={`Bună, ${user?.firstName ?? ''}!`}
        subtitle="Aici găsești următoarea programare și rezervările tale."
        action={
          <ButtonLink to="/rezervare">
            <Plus className="h-4 w-4" /> Rezervare nouă
          </ButtonLink>
        }
      />

      <QueryState query={res}>
        <section aria-labelledby="next-title" className="mb-10">
          <h2 id="next-title" className="mb-4 font-display text-2xl font-semibold">
            Următoarea programare
          </h2>
          {next ? (
            <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-6 text-white sm:p-8">
              <div className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full bg-gold-500/20 blur-2xl" aria-hidden />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-display text-3xl font-semibold">{next.serviceName}</p>
                    <StatusBadge status={next.status} />
                  </div>
                  <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sand-200">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gold-400" aria-hidden /> {formatDateLong(next.startDateTime)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gold-400" aria-hidden /> {formatTime(next.startDateTime)}
                    </span>
                    <span>{formatMoney(next.price, settings.currency)}</span>
                  </p>
                </div>
                <ButtonLink to={`/rezervari/${next.id}`} variant="gold">
                  Vezi detalii
                </ButtonLink>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Nu ai nicio programare viitoare."
              description="Alege un serviciu și rezervă-ți locul în câteva clickuri."
              action={<ButtonLink to="/rezervare">Programează o rezervare</ButtonLink>}
            />
          )}
        </section>

        {res.upcoming.length > 1 && (
          <section className="mb-10">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl font-semibold">Alte rezervări viitoare</h2>
              <Link to="/rezervarile-mele" className="text-sm font-medium text-gold-600 hover:underline">
                Vezi toate →
              </Link>
            </div>
            <div className="space-y-3">
              {res.upcoming.slice(1, 4).map((r) => (
                <ReservationCard key={r.id} reservation={r} onCancel={setToCancel} />
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <QuickLink to="/rezervarile-mele" title="Rezervările mele" text="Istoric, modificări, anulări" />
          <QuickLink to="/calendar" title="Calendar" text="Programările tale pe calendar" />
          <QuickLink to="/profil" title="Profil" text="Date personale și parolă" />
        </div>
      </QueryState>

      <CancelReservationDialog reservation={toCancel} onClose={() => setToCancel(null)} />
    </div>
  );
}

function QuickLink({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link to={to} className="card p-5 transition hover:-translate-y-0.5 hover:border-gold-400">
      <p className="font-display text-xl font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink-500">{text}</p>
    </Link>
  );
}
