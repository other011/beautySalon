import { useQuery } from '@tanstack/react-query';
import { availabilityApi } from '../../services/endpoints';
import { hhmm } from '../../utils/format';
import { EmptyState, ErrorState, Spinner } from '../ui/States';

interface Props {
  serviceId: number;
  date: string;
  value: string | null; // HH:mm
  onChange: (time: string) => void;
  /** Start time (HH:mm) of the reservation being rescheduled on this date: its own slot stays selectable. */
  ownSlot?: string | null;
}

/** Time slots for a day. Booked / blocked slots are shown but cannot be selected. */
export function SlotPicker({ serviceId, date, value, onChange, ownSlot }: Props) {
  const query = useQuery({
    queryKey: ['availability', serviceId, date],
    queryFn: () => availabilityApi.day(serviceId, date),
    refetchOnWindowFocus: true,
  });

  if (query.isLoading) return <Spinner label="Se caută intervalele libere…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const day = query.data!;
  if (!day.open) return <EmptyState title="Salonul este închis în această zi." description="Alege o altă zi din calendar." />;

  const slots = day.slots.filter((s) => s.reason !== 'PAST');
  if (slots.length === 0) return <EmptyState title="Nu mai există intervale pentru această zi." description="Alege o altă zi din calendar." />;
  if (!slots.some((s) => s.available || hhmm(s.start) === ownSlot)) {
    return <EmptyState title="Toate intervalele sunt ocupate în această zi." description="Alege o altă zi din calendar." />;
  }

  return (
    <div role="group" aria-label="Ore disponibile" className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {slots.map((s) => {
        const time = hhmm(s.start);
        const own = ownSlot === time;
        const disabled = !s.available && !own;
        const selected = value === time;
        const label = s.reason === 'BOOKED' ? 'Rezervat' : 'Indisponibil';
        return (
          <button
            key={s.start}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            aria-label={disabled ? `${time} – ${label}` : time}
            onClick={() => onChange(time)}
            className={`flex flex-col items-center rounded-xl border px-2 py-2.5 text-sm transition
              ${selected ? 'border-ink-800 bg-ink-800 font-semibold text-white' : disabled ? 'cursor-not-allowed border-sand-200 bg-sand-50 text-ink-400' : 'border-sand-300 bg-white font-medium hover:border-gold-400 hover:bg-gold-100/50'}`}
          >
            <span className={disabled ? 'line-through' : ''}>{time}</span>
            {disabled && <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">{s.reason === 'BOOKED' ? 'REZERVAT' : label}</span>}
          </button>
        );
      })}
    </div>
  );
}
