import roLocale from '@fullcalendar/core/locales/ro';
import type { DatesSetArg, EventContentArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { ReservationDetailModal } from '../../components/admin/ReservationDetailModal';
import { ReservationFormModal } from '../../components/admin/ReservationFormModal';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import { useToast } from '../../hooks/useToast';
import { reservationsApi, scheduleApi } from '../../services/endpoints';
import type { BlockedSlot, BusinessHours, Reservation, ReservationStatus } from '../../types';
import { friendlyError } from '../../utils/errors';
import { formatTime, hhmm, toISODate } from '../../utils/format';

const COLORS: Record<ReservationStatus, string> = {
  PENDING: '#c99a1c',
  CONFIRMED: '#2f855a',
  COMPLETED: '#76767d',
  CANCELLED: '#c0392b',
  NO_SHOW: '#7b4fa3',
};

/** FullCalendar uses 0 = Sunday, the API 1 = Monday ... 7 = Sunday. */
const fcDay = (d: number) => d % 7;

function blockedToEvents(blocked: BlockedSlot[]) {
  return blocked.map((b) => {
    const common = { id: `b${b.id}`, title: b.reason || 'Indisponibil', display: 'background' as const, color: '#d9c7b2' };
    if (b.recurrence === 'NONE') return { ...common, start: b.startDateTime, end: b.endDateTime };
    const dow = b.recurrence === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6] : [new Date(b.startDateTime).getDay()];
    return { ...common, daysOfWeek: dow, startTime: b.startDateTime.slice(11, 16), endTime: b.endDateTime.slice(11, 16), startRecur: b.startDateTime.slice(0, 10), endRecur: b.recurrenceUntil ?? undefined };
  });
}

function renderEvent(arg: EventContentArg) {
  if (arg.event.display === 'background') return undefined;
  const r = arg.event.extendedProps.reservation as Reservation;
  return (
    <div className="overflow-hidden px-1 text-[11px] leading-tight text-white">
      <div className="font-semibold">
        {formatTime(r.startDateTime)} · {r.clientName}
        {r.guest && <span className="ml-1 rounded bg-white/25 px-1 text-[10px] font-medium">fără cont</span>}
      </div>
      <div className="opacity-90">
        {r.serviceName} · {r.durationMinutes} min
      </div>
    </div>
  );
}

export default function AdminCalendar() {
  const qc = useQueryClient();
  const toast = useToast();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [creating, setCreating] = useState<{ date?: string; time?: string } | null>(null);

  const reservations = useQuery({
    queryKey: ['reservations', 'calendar', range],
    queryFn: () => reservationsApi.calendar(range!.from, range!.to),
    enabled: !!range,
  });
  const schedule = useQuery({ queryKey: ['schedule-admin'], queryFn: scheduleApi.get });

  const events = useMemo(
    () => [
      ...(reservations.data ?? [])
        .filter((r) => r.status !== 'CANCELLED')
        .map((r) => ({
          id: String(r.id),
          title: `${r.clientName} – ${r.serviceName}`,
          start: r.startDateTime,
          end: r.endDateTime,
          backgroundColor: COLORS[r.status],
          borderColor: COLORS[r.status],
          editable: r.status === 'PENDING' || r.status === 'CONFIRMED',
          classNames: r.guest ? ['guest-event'] : [],
          extendedProps: { reservation: r },
        })),
      ...blockedToEvents(schedule.data?.blockedSlots ?? []),
    ],
    [reservations.data, schedule.data],
  );

  // stable identity + no-op when unchanged: FullCalendar re-emits datesSet when the callback changes
  const onDatesSet = useCallback((arg: DatesSetArg) => {
    const from = arg.startStr.slice(0, 10);
    const to = arg.endStr.slice(0, 10);
    setRange((prev) => (prev && prev.from === from && prev.to === to ? prev : { from, to }));
  }, []);

  const hours: BusinessHours[] = schedule.data?.hours ?? [];
  const active = hours.filter((h) => h.active);
  const businessHours = active.map((h) => ({ daysOfWeek: [fcDay(h.dayOfWeek)], startTime: hhmm(h.openingTime), endTime: hhmm(h.closingTime) }));
  const slotMin = active.length ? active.map((h) => hhmm(h.openingTime)).sort()[0] : '08:00';
  const slotMax = active.length ? active.map((h) => hhmm(h.closingTime)).sort().reverse()[0] : '20:00';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const onDrop = async (arg: EventDropArg) => {
    const r = arg.event.extendedProps.reservation as Reservation;
    const start = arg.event.start!;
    const pad = (n: number) => String(n).padStart(2, '0');
    const startDateTime = `${toISODate(start)}T${pad(start.getHours())}:${pad(start.getMinutes())}:00`;
    try {
      await reservationsApi.update(r.id, { serviceId: r.serviceId, startDateTime, notes: r.notes ?? undefined, userId: r.userId ?? undefined, status: r.status });
      toast.success('Rezervarea a fost mutată.');
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    } catch (e) {
      arg.revert();
      toast.error(friendlyError(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="Calendar rezervări"
        subtitle="Click pe o oră liberă pentru a crea o rezervare, click pe o rezervare pentru detalii. Rezervările active se pot muta prin drag & drop."
        action={
          <Button variant="gold" onClick={() => setCreating({})}>
            <Plus className="h-4 w-4" /> Rezervare nouă
          </Button>
        }
      />
      {(reservations.isError || schedule.isError) && <ErrorState error={reservations.error ?? schedule.error} onRetry={() => { reservations.refetch(); schedule.refetch(); }} />}
      <div className="card p-3 sm:p-5">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          locales={[roLocale]}
          locale="ro"
          initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          buttonText={{ today: 'Azi', month: 'Lună', week: 'Săptămână', day: 'Zi' }}
          firstDay={1}
          height="auto"
          allDaySlot={false}
          nowIndicator
          slotMinTime={slotMin + ':00'}
          slotMaxTime={slotMax + ':00'}
          slotDuration="00:30:00"
          businessHours={businessHours.length ? businessHours : false}
          editable
          eventDurationEditable={false}
          events={events}
          eventContent={renderEvent}
          datesSet={onDatesSet}
          dateClick={(arg: DateClickArg) => {
            const iso = arg.dateStr.slice(0, 10);
            setCreating({ date: iso, time: arg.dateStr.length > 10 ? arg.dateStr.slice(11, 16) : undefined });
          }}
          eventClick={(arg) => {
            const r = arg.event.extendedProps.reservation as Reservation | undefined;
            if (r) setSelected(r);
          }}
          eventDrop={onDrop}
          noEventsText="Nu există rezervări pentru această perioadă."
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-600">
        {(Object.keys(COLORS) as ReservationStatus[])
          .filter((s) => s !== 'CANCELLED')
          .map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded" style={{ background: COLORS[s] }} />
              {{ PENDING: 'În așteptare', CONFIRMED: 'Confirmată', COMPLETED: 'Finalizată', NO_SHOW: 'Absent', CANCELLED: '' }[s]}
            </span>
          ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="guest-event h-3 w-3 rounded bg-ink-500" /> Programare fără cont
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-sand-300" /> Indisponibil
        </span>
      </div>

      <ReservationDetailModal
        reservation={selected}
        onClose={() => setSelected(null)}
        onEdit={(r) => {
          setSelected(null);
          setEditing(r);
        }}
      />
      <ReservationFormModal open={!!editing} reservation={editing} onClose={() => setEditing(null)} />
      <ReservationFormModal open={!!creating} initial={creating ?? undefined} onClose={() => setCreating(null)} />
    </div>
  );
}
