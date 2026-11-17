import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CancelReservationDialog } from '../../components/CancelReservationDialog';
import { PageHeader } from '../../components/PageHeader';
import { ReservationCard } from '../../components/ReservationCard';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, QueryState } from '../../components/ui/States';
import { useMyReservations } from '../../hooks/useMyReservations';
import type { Reservation } from '../../types';

export default function MyReservations() {
  const res = useMyReservations();
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [toCancel, setToCancel] = useState<Reservation | null>(null);
  const list = tab === 'upcoming' ? res.upcoming : res.history;

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Contul meu"
        title="Rezervările mele"
        action={
          <ButtonLink to="/rezervare">
            <Plus className="h-4 w-4" /> Rezervare nouă
          </ButtonLink>
        }
      />
      <div role="tablist" aria-label="Tip rezervări" className="mb-6 inline-flex rounded-full bg-sand-100 p-1">
        {(
          [
            ['upcoming', `Viitoare (${res.upcoming.length})`],
            ['history', `Istoric (${res.history.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === key ? 'bg-white shadow-card' : 'text-ink-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <QueryState query={res}>
        {list.length === 0 ? (
          <EmptyState
            title={tab === 'upcoming' ? 'Nu ai rezervări viitoare.' : 'Nu ai încă nicio rezervare în istoric.'}
            action={tab === 'upcoming' ? <ButtonLink to="/rezervare">Programează o rezervare</ButtonLink> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {list.map((r) => (
              <ReservationCard key={r.id} reservation={r} onCancel={setToCancel} />
            ))}
          </div>
        )}
      </QueryState>

      <CancelReservationDialog reservation={toCancel} onClose={() => setToCancel(null)} />
    </div>
  );
}
