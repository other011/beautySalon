import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ReservationDetailModal } from '../../components/admin/ReservationDetailModal';
import { ReservationFormModal } from '../../components/admin/ReservationFormModal';
import { PageHeader } from '../../components/PageHeader';
import { Pill, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { EmptyState, QueryState } from '../../components/ui/States';
import { useSettings } from '../../hooks/useSettings';
import { reservationsApi, servicesApi } from '../../services/endpoints';
import type { Reservation, ReservationQuery, ReservationStatus } from '../../types';
import { formatDate, formatMoney, formatTime, STATUS_LABEL } from '../../utils/format';

const SIZE = 15;

export default function AdminReservations() {
  const { settings } = useSettings();
  const [filters, setFilters] = useState<ReservationQuery>({ q: '', serviceId: '', status: '', dateFrom: '', dateTo: '', sort: 'date', dir: 'desc' });
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q ?? ''), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const services = useQuery({ queryKey: ['services', 'all'], queryFn: () => servicesApi.list(true) });
  const query = useQuery({
    queryKey: ['reservations', 'admin-list', { ...filters, q: debouncedQ, page }],
    queryFn: () => reservationsApi.list({ ...filters, q: debouncedQ, page, size: SIZE }),
    placeholderData: (prev) => prev,
  });

  const update = (patch: Partial<ReservationQuery>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };
  const sortBy = (col: NonNullable<ReservationQuery['sort']>) =>
    update({ sort: col, dir: filters.sort === col && filters.dir === 'asc' ? 'desc' : 'asc' });

  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / SIZE));

  const Th = ({ col, children }: { col: NonNullable<ReservationQuery['sort']>; children: React.ReactNode }) => (
    <th scope="col" className="px-4 py-3 text-left">
      <button onClick={() => sortBy(col)} className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-ink-900" aria-label={`Sortează după ${children}`}>
        {children}
        {filters.sort === col && (filters.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div>
      <PageHeader
        title="Rezervări"
        subtitle="Caută, filtrează și gestionează toate rezervările."
        action={
          <Button variant="gold" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Rezervare nouă
          </Button>
        }
      />

      <div className="card mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <TextField label="Client" placeholder="Nume, email sau telefon" value={filters.q ?? ''} onChange={(e) => update({ q: e.target.value })} className="pl-10" />
          <Search className="pointer-events-none absolute bottom-3 left-3.5 h-4 w-4 text-ink-400" aria-hidden />
        </div>
        <SelectField label="Serviciu" value={filters.serviceId ?? ''} onChange={(e) => update({ serviceId: e.target.value ? Number(e.target.value) : '' })}>
          <option value="">Toate</option>
          {services.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Status" value={filters.status ?? ''} onChange={(e) => update({ status: e.target.value as ReservationStatus | '' })}>
          <option value="">Toate</option>
          {(Object.keys(STATUS_LABEL) as ReservationStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Tip client" value={filters.guest === '' || filters.guest === undefined ? '' : String(filters.guest)} onChange={(e) => update({ guest: e.target.value === '' ? '' : e.target.value === 'true' })}>
          <option value="">Toți</option>
          <option value="false">Cu cont</option>
          <option value="true">Fără cont</option>
        </SelectField>
        <TextField label="De la" type="date" value={filters.dateFrom ?? ''} onChange={(e) => update({ dateFrom: e.target.value })} />
        <TextField label="Până la" type="date" value={filters.dateTo ?? ''} onChange={(e) => update({ dateTo: e.target.value })} />
      </div>

      <QueryState query={query}>
        {query.data?.items.length === 0 ? (
          <EmptyState title="Nu există rezervări pentru filtrele selectate." />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-sand-50 text-xs text-ink-500">
                  <tr>
                    <Th col="date">Data</Th>
                    <Th col="client">Client</Th>
                    <Th col="service">Serviciu</Th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold uppercase tracking-wide">
                      Preț
                    </th>
                    <Th col="status">Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {query.data?.items.map((r) => (
                    <tr key={r.id} tabIndex={0} onClick={() => setSelected(r)} onKeyDown={(e) => e.key === 'Enter' && setSelected(r)} className="cursor-pointer transition hover:bg-sand-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{formatDate(r.startDateTime)}</p>
                        <p className="text-xs text-ink-500">
                          {formatTime(r.startDateTime)} – {formatTime(r.endDateTime)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          {r.clientName}
                          {r.guest && <Pill tone="gold">Fără cont</Pill>}
                        </p>
                        <p className="text-xs text-ink-500">
                          {r.clientPhone || r.clientEmail}
                          {r.visitCount !== null && <span className="ml-2 text-ink-400">· {r.visitCount} {r.visitCount === 1 ? 'vizită' : 'vizite'}</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3">{r.serviceName}</td>
                      <td className="px-4 py-3">{formatMoney(r.price, settings.currency)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-sand-200 px-4 py-3 text-sm text-ink-600">
              <span>
                {total} rezervări · pagina {page + 1} din {pages}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Înapoi
                </Button>
                <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                  Înainte
                </Button>
              </span>
            </div>
          </div>
        )}
      </QueryState>

      <ReservationDetailModal
        reservation={selected}
        onClose={() => setSelected(null)}
        onEdit={(r) => {
          setSelected(null);
          setEditing(r);
        }}
      />
      <ReservationFormModal open={!!editing} reservation={editing} onClose={() => setEditing(null)} />
      <ReservationFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
