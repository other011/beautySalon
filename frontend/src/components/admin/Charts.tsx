import type { NamedCount, SeriesPoint } from '../../types';

export function StatCard({ label, value, hint, accent = false }: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-ink-800 bg-ink-800 text-white' : 'border-sand-200 bg-white shadow-card'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-gold-300' : 'text-ink-400'}`}>{label}</p>
      <p className={`mt-2 font-display text-4xl font-semibold ${accent ? 'text-white' : 'text-ink-900'}`}>{value}</p>
      {hint && <p className={`mt-1 text-sm ${accent ? 'text-sand-300' : 'text-ink-500'}`}>{hint}</p>}
    </div>
  );
}

/** Minimal dependency-free bar chart. */
export function BarChart({ points, title }: { points: SeriesPoint[]; title: string }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((s, p) => s + p.count, 0);
  const step = points.length > 16 ? 3 : points.length > 10 ? 2 : 1;
  return (
    <figure role="img" aria-label={`${title}: ${total} rezervări în total`}>
      <div className="flex h-40 items-end gap-1.5">
        {points.map((p) => (
          <div key={p.label} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-gold-500 to-gold-300 transition group-hover:from-ink-800 group-hover:to-ink-600"
              style={{ height: `${Math.max(p.count > 0 ? 6 : 2, (p.count / max) * 100)}%`, opacity: p.count === 0 ? 0.25 : 1 }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-white opacity-0 group-hover:opacity-100">{p.count}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 text-[10px] text-ink-400">
        {points.map((p, i) => (
          <span key={p.label} className="flex-1 truncate text-center">
            {i % step === 0 ? p.label : ''}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function PopularServices({ items, currency }: { items: NamedCount[]; currency: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <p className="text-sm text-ink-500">Nu există date încă.</p>;
  return (
    <ul className="space-y-4">
      {items.map((s) => (
        <li key={s.name}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium">{s.name}</span>
            <span className="text-ink-500">
              {s.count} rezervări · {Math.round(s.revenue)} {currency}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sand-100">
            <div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500" style={{ width: `${(s.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
