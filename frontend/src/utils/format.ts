import type { ReservationStatus } from '../types';

const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const DAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
export const WEEKDAYS_SHORT = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
export const WEEKDAYS_ISO = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

/** Local yyyy-MM-dd (never goes through UTC, which would shift the day). */
export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-10-10T15:00:00" -> Date in local time. */
export function parseDateTime(s: string): Date {
  const [date, time = '00:00'] = s.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export const hhmm = (t: string) => t.slice(0, 5);

export function formatDate(s: string | Date): string {
  const d = typeof s === 'string' ? parseDateTime(s.length === 10 ? `${s}T00:00` : s) : s;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateLong(s: string | Date): string {
  const d = typeof s === 'string' ? parseDateTime(s.length === 10 ? `${s}T00:00` : s) : s;
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(s: string): string {
  const d = parseDateTime(s);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateTime(s: string): string {
  return `${formatDate(s)}, ${formatTime(s)}`;
}

export function formatAuditDate(s: string): string {
  const d = parseDateTime(s);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function monthTitle(year: number, month0: number): string {
  const name = MONTHS[month0];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export function formatMoney(amount: number, currency = 'RON'): string {
  const n = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  return `${n} ${currency}`;
}

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'În așteptare',
  CONFIRMED: 'Confirmată',
  COMPLETED: 'Finalizată',
  CANCELLED: 'Anulată',
  NO_SHOW: 'Absent',
};

export function isUpcoming(startDateTime: string): boolean {
  return parseDateTime(startDateTime).getTime() > Date.now();
}
