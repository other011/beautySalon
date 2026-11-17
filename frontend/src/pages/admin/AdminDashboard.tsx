import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, PopularServices, StatCard } from '../../components/admin/Charts';
import { PageHeader } from '../../components/PageHeader';
import { ButtonLink } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/States';
import { useSettings } from '../../hooks/useSettings';
import { statsApi } from '../../services/endpoints';
import { formatDateTime } from '../../utils/format';

export default function AdminDashboard() {
  const { settings } = useSettings();
  const query = useQuery({ queryKey: ['dashboard'], queryFn: statsApi.dashboard, refetchInterval: 60_000 });
  const d = query.data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Imaginea de ansamblu a salonului."
        action={
          <ButtonLink to="/admin/calendar" variant="gold">
            Deschide calendarul
          </ButtonLink>
        }
      />
      <QueryState query={query}>
        {d && (
          <div className="space-y-8">
            <section aria-labelledby="today">
              <h2 id="today" className="mb-3 font-display text-2xl font-semibold">
                Astăzi
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard accent label="Rezervări astăzi" value={d.today.total} />
                <StatCard label="Clienți programați" value={d.today.scheduledClients} />
                <StatCard label="Finalizate" value={d.today.completed} />
                <StatCard label="Anulate" value={d.today.cancelled} hint={d.today.noShow ? `${d.today.noShow} absenți` : undefined} />
                <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Următoarea rezervare</p>
                  {d.today.next ? (
                    <div className="mt-2 text-sm">
                      <p className="font-display text-xl font-semibold">{d.today.next.clientName}</p>
                      <p className="text-ink-600">{d.today.next.serviceName}</p>
                      <p className="text-gold-600">{formatDateTime(d.today.next.start)}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-ink-500">Nicio rezervare viitoare.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Total clienți" value={d.totalClients} hint="conturi de client" />
              <StatCard label="Serviciul cel mai solicitat" value={d.topService ?? '—'} />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Panel title="Rezervări pe zi" hint="ultimele 7 zile și următoarele 7">
                <BarChart points={d.perDay} title="Rezervări pe zi" />
              </Panel>
              <Panel title="Rezervări pe săptămână" hint="începând de luni">
                <BarChart points={d.perWeek} title="Rezervări pe săptămână" />
              </Panel>
              <Panel title="Rezervări pe lună">
                <BarChart points={d.perMonth} title="Rezervări pe lună" />
              </Panel>
              <Panel title="Servicii populare">
                <PopularServices items={d.popularServices} currency={settings.currency} />
              </Panel>
            </section>

            <p className="text-sm text-ink-500">
              Mai multe detalii în <Link to="/admin/statistici" className="font-medium text-gold-600 hover:underline">Statistici</Link>.
            </p>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        {hint && <p className="text-xs text-ink-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
