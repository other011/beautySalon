import roLocale from '@fullcalendar/core/locales/ro';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import { useQuery } from '@tanstack/react-query';
import type { DatesSetArg } from '@fullcalendar/core';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { ErrorState } from '../../components/ui/States';
import { reservationsApi } from '../../services/endpoints';
import { ReservationStatus } from '../../types';

const COLORS: Record<ReservationStatus, string> = {
  PENDING: '#d4a017',
  CONFIRMED: '#2f855a',
  COMPLETED: '#76767d',
  CANCELLED: '#c0392b',
  NO_SHOW: '#7b4fa3',
};

/** The client's own reservations on a calendar. Mobile starts in list view, which reads better on small screens. */
export default function ClientCalendar() {
  const navigate = useNavigate();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const query = useQuery({
    queryKey: ['reservations', 'calendar-mine', range],
    queryFn: () => reservationsApi.calendar(range!.from, range!.to),
    enabled: !!range,
  });
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // stable identity + no-op when unchanged: FullCalendar re-emits datesSet when the callback changes
  const onDatesSet = useCallback((arg: DatesSetArg) => {
    const from = arg.startStr.slice(0, 10);
    const to = arg.endStr.slice(0, 10);
    setRange((prev) => (prev && prev.from === from && prev.to === to ? prev : { from, to }));
  }, []);

  const events = useMemo(
    () =>
      (query.data ?? [])
        .filter((r) => r.status !== 'CANCELLED')
        .map((r) => ({ id: String(r.id), title: r.serviceName, start: r.startDateTime, end: r.endDateTime, color: COLORS[r.status] })),
    [query.data],
  );

  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Contul meu" title="Calendar" subtitle="Toate programările tale într-un singur loc." />
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      <div className="card p-3 sm:p-5">
        <FullCalendar
          plugins={[dayGridPlugin, listPlugin]}
          locales={[roLocale]}
          locale="ro"
          initialView={isMobile ? 'listMonth' : 'dayGridMonth'}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' }}
          height="auto"
          firstDay={1}
          events={events}
          datesSet={onDatesSet}
          eventClick={(info) => navigate(`/rezervari/${info.event.id}`)}
          noEventsText="Nu există rezervări în această perioadă."
        />
      </div>
    </div>
  );
}
