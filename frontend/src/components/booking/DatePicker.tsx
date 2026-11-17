import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { availabilityApi } from '../../services/endpoints';
import { WEEKDAYS_SHORT, formatDateLong, monthTitle, parseISODate, toISODate } from '../../utils/format';
import { ErrorState } from '../ui/States';

interface Props {
  serviceId: number;
  value: string | null;
  onChange: (isoDate: string) => void;
}

/** Month calendar in which closed, fully booked and past days are disabled (data comes from the API). */
export function DatePicker({ serviceId, value, onChange }: Props) {
  const today = new Date();
  const [view, setView] = useState(() => {
    const base = value ? parseISODate(value) : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const monthKey = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}`;

  const query = useQuery({
    queryKey: ['availability-days', serviceId, monthKey],
    queryFn: () => availabilityApi.days(serviceId, monthKey),
  });

  const availability = useMemo(() => {
    const map = new Map<string, { available: boolean; freeSlots: number }>();
    query.data?.forEach((d) => map.set(d.date, d));
    return map;
  }, [query.data]);

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ];

  const canGoBack = view.getFullYear() > today.getFullYear() || view.getMonth() > today.getMonth();
  const todayIso = toISODate(today);

  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-4 sm:p-5" data-testid="date-picker">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          disabled={!canGoBack}
          aria-label="Luna anterioară"
          className="rounded-full p-2 text-ink-700 hover:bg-sand-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-display text-xl font-semibold" aria-live="polite">
          {monthTitle(view.getFullYear(), view.getMonth())}
        </p>
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          aria-label="Luna următoare"
          className="rounded-full p-2 text-ink-700 hover:bg-sand-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink-400">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className={`mt-1 grid grid-cols-7 gap-1 ${query.isLoading ? 'opacity-50' : ''}`}>
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const iso = toISODate(date);
          const info = availability.get(iso);
          const disabled = query.isLoading || iso < todayIso || !info?.available;
          const selected = value === iso;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-label={formatDateLong(date) + (disabled ? ' – indisponibil' : '')}
              aria-pressed={selected}
              onClick={() => onChange(iso)}
              className={`relative flex aspect-square items-center justify-center rounded-xl text-sm transition
                ${selected ? 'bg-ink-800 font-semibold text-white' : disabled ? 'cursor-not-allowed text-ink-300 line-through decoration-ink-300/60 text-ink-400/60' : 'bg-sand-50 font-medium text-ink-800 hover:bg-gold-100'}
                ${iso === todayIso && !selected ? 'ring-1 ring-gold-400' : ''}`}
            >
              {date.getDate()}
              {!disabled && !selected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold-500" aria-hidden />}
            </button>
          );
        })}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-ink-500">
        <span className="h-2 w-2 rounded-full bg-gold-500" aria-hidden /> zile cu intervale libere
      </p>
    </div>
  );
}
