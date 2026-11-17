import { useQuery } from '@tanstack/react-query';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { scheduleApi } from '../services/endpoints';
import { WEEKDAYS_ISO, hhmm } from '../utils/format';

export function OpeningHours() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['schedule-public'], queryFn: scheduleApi.get, staleTime: 5 * 60_000 });
  if (isLoading) return <p className="text-sm text-ink-500">Se încarcă programul…</p>;
  if (isError || !data) return <p className="text-sm text-ink-500">Programul nu poate fi afișat momentan.</p>;
  const byDay = new Map(data.hours.map((h) => [h.dayOfWeek, h]));
  return (
    <ul className="divide-y divide-sand-200 text-sm" aria-label="Program">
      {WEEKDAYS_ISO.map((name, i) => {
        const h = byDay.get(i + 1);
        const open = h?.active;
        return (
          <li key={name} className="flex justify-between py-2">
            <span className="text-ink-600">{name}</span>
            <span className={open ? 'font-medium text-ink-800' : 'text-ink-400'}>{open && h ? `${hhmm(h.openingTime)} – ${hhmm(h.closingTime)}` : 'Închis'}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Address, phone, e-mail, opening hours and an embedded map. Everything comes from Admin → Settings. */
export function LocationBlock() {
  const { settings } = useSettings();
  const query = encodeURIComponent(`${settings.address}, ${settings.city}`);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <ul className="space-y-4 text-ink-700">
          <li className="flex gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" aria-hidden />
            <span>
              {settings.address}
              <br />
              {settings.city}
            </span>
          </li>
          <li className="flex gap-3">
            <Phone className="h-5 w-5 shrink-0 text-gold-500" aria-hidden />
            <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="hover:text-gold-600">
              {settings.phone}
            </a>
          </li>
          <li className="flex gap-3">
            <Mail className="h-5 w-5 shrink-0 text-gold-500" aria-hidden />
            <a href={`mailto:${settings.email}`} className="hover:text-gold-600">
              {settings.email}
            </a>
          </li>
        </ul>
        <div className="card p-5">
          <p className="mb-2 flex items-center gap-2 font-display text-xl font-semibold">
            <Clock className="h-5 w-5 text-gold-500" aria-hidden /> Program
          </p>
          <OpeningHours />
        </div>
      </div>
      <div className="min-h-[320px] overflow-hidden rounded-3xl border border-sand-200 shadow-card">
        <iframe
          title={`Hartă – ${settings.address}, ${settings.city}`}
          src={`https://www.google.com/maps?q=${query}&output=embed`}
          className="h-full min-h-[320px] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
