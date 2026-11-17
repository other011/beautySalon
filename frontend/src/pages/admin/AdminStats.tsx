import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { BarChart, PopularServices, StatCard } from '../../components/admin/Charts';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/States';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { statsApi } from '../../services/endpoints';
import type { Period } from '../../types';
import { friendlyError } from '../../utils/errors';
import { formatMoney } from '../../utils/format';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Azi' },
  { key: 'week', label: 'Săptămâna aceasta' },
  { key: 'month', label: 'Luna aceasta' },
  { key: 'year', label: 'Anul acesta' },
];

export default function AdminStats() {
  const { settings } = useSettings();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('month');
  const [exporting, setExporting] = useState(false);
  const query = useQuery({ queryKey: ['report', period], queryFn: () => statsApi.report(period) });
  const r = query.data;
  const cur = settings.currency;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await statsApi.exportCsv(period);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Statistici"
        subtitle="Rezultatele salonului pe perioade."
        action={
          <Button variant="secondary" onClick={exportCsv} loading={exporting}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />
      <div role="tablist" aria-label="Perioadă" className="mb-6 inline-flex flex-wrap gap-1 rounded-full bg-sand-100 p-1">
        {PERIODS.map((p) => (
          <button key={p.key} role="tab" aria-selected={period === p.key} onClick={() => setPeriod(p.key)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${period === p.key ? 'bg-white shadow-card' : 'text-ink-600'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <QueryState query={query}>
        {r && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard accent label="Total rezervări" value={r.total} hint={`${r.upcoming} viitoare`} />
              <StatCard label="Finalizate" value={r.completed} />
              <StatCard label="Anulate" value={r.cancelled} />
              <StatCard label="No-show" value={r.noShow} />
              <StatCard label="Venit realizat" value={formatMoney(r.revenue, cur)} hint="rezervări finalizate" />
              <StatCard label="Venit estimat" value={formatMoney(r.estimatedRevenue, cur)} hint="finalizate + viitoare" />
              <StatCard label="Clienți noi" value={r.newClients} />
              <StatCard label="Clienți recurenți" value={r.returningClients} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card p-5">
                <h2 className="mb-4 font-display text-xl font-semibold">Rezervări în perioadă</h2>
                <BarChart points={r.series} title="Rezervări în perioadă" />
              </div>
              <div className="card p-5">
                <h2 className="mb-4 font-display text-xl font-semibold">Servicii populare</h2>
                <PopularServices items={r.popularServices} currency={cur} />
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
