import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { ReservationFormModal } from '../../components/admin/ReservationFormModal';
import { PageHeader } from '../../components/PageHeader';
import { Pill, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, QueryState, Spinner } from '../../components/ui/States';
import { useToast } from '../../hooks/useToast';
import { reservationsApi, usersApi } from '../../services/endpoints';
import type { User } from '../../types';
import { fieldErrors, friendlyError } from '../../utils/errors';
import { formatDate, formatDateTime } from '../../utils/format';
import { EMAIL_RE, MSG, PHONE_RE } from '../../utils/validation';

const SIZE = 15;

function GuestsTab({ q }: { q: string }) {
  const query = useQuery({ queryKey: ['clients', 'guests', q], queryFn: () => usersApi.guests(q) });
  return (
    <QueryState query={query}>
      {query.data?.length === 0 ? (
        <EmptyState title="Nu există clienți fără cont." description="Apar aici persoanele care fac o programare fără să-și creeze cont, grupate după numărul de telefon." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">Nume (ultima programare)</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Vizite</th>
                  <th className="px-4 py-3">Programări</th>
                  <th className="px-4 py-3">Ultima programare</th>
                  <th className="px-4 py-3">Cont</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {query.data?.map((g) => (
                  <tr key={g.phone + g.lastBooking}>
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3">{g.phone}</td>
                    <td className="px-4 py-3 font-semibold">{g.visits}</td>
                    <td className="px-4 py-3">{g.bookings}</td>
                    <td className="px-4 py-3">{formatDate(g.lastBooking)}</td>
                    <td className="px-4 py-3">{g.hasAccount ? <Pill tone="green">Are cont acum</Pill> : <Pill tone="gold">Fără cont</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-sand-200 px-4 py-3 text-xs text-ink-500">Clienții sunt recunoscuți după numărul de telefon (numele nu sunt unice). Vizite = programări finalizate cu acest număr.</p>
        </div>
      )}
    </QueryState>
  );
}

export default function AdminClients() {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<User | null>(null);
  const [formFor, setFormFor] = useState<User | 'new' | null>(null);
  const [booking, setBooking] = useState<User | null>(null);
  const [tab, setTab] = useState<'accounts' | 'guests'>('accounts');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useQuery({ queryKey: ['clients', debounced, page], queryFn: () => usersApi.list(debounced, page, SIZE), placeholderData: (p) => p });
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / SIZE));

  const toggle = useMutation({
    mutationFn: (u: User) => usersApi.update(u.id, { firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone ?? '', active: !u.active }),
    onSuccess: (u) => {
      toast.success(u.active ? 'Cont reactivat.' : 'Cont dezactivat.');
      qc.invalidateQueries({ queryKey: ['clients'] });
      setSelected(u);
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Clienți"
        subtitle="Caută și gestionează conturile clienților."
        action={
          <Button variant="gold" onClick={() => setFormFor('new')}>
            <Plus className="h-4 w-4" /> Client nou
          </Button>
        }
      />
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <input className="input pl-10" aria-label="Caută clienți" placeholder="Nume, email sau telefon…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div role="tablist" aria-label="Tip clienți" className="mb-6 inline-flex rounded-full bg-sand-100 p-1">
        {([['accounts', 'Cu cont'], ['guests', 'Fără cont']] as const).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === key ? 'bg-white shadow-card' : 'text-ink-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'guests' && <GuestsTab q={debounced} />}
      {tab === 'accounts' && (
      <QueryState query={query}>
        {query.data?.items.length === 0 ? (
          <EmptyState title="Nu am găsit niciun client." />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Vizite</th>
                    <th className="px-4 py-3">Ultima vizită</th>
                    <th className="px-4 py-3">Cont</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {query.data?.items.map((u) => (
                    <tr key={u.id} tabIndex={0} onClick={() => setSelected(u)} onKeyDown={(e) => e.key === 'Enter' && setSelected(u)} className="cursor-pointer hover:bg-sand-50">
                      <td className="px-4 py-3 font-medium">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <p>{u.email}</p>
                        <p className="text-xs text-ink-500">{u.phone}</p>
                      </td>
                      <td className="px-4 py-3">{u.visits ?? 0}</td>
                      <td className="px-4 py-3">{u.lastVisit ? formatDate(u.lastVisit) : '—'}</td>
                      <td className="px-4 py-3">{u.active ? <Pill tone="green">Activ</Pill> : <Pill tone="red">Dezactivat</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-sand-200 px-4 py-3 text-sm text-ink-600">
              <span>
                {total} clienți · pagina {page + 1} din {pages}
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
      )}

      <ClientDetail
        user={selected}
        onClose={() => setSelected(null)}
        onEdit={(u) => {
          setSelected(null);
          setFormFor(u);
        }}
        onToggle={(u) => toggle.mutate(u)}
        toggling={toggle.isPending}
        onBook={(u) => {
          setSelected(null);
          setBooking(u);
        }}
      />
      <ClientForm target={formFor} onClose={() => setFormFor(null)} />
      <ReservationFormModal open={!!booking} initial={booking ? { client: booking } : undefined} onClose={() => setBooking(null)} />
    </div>
  );
}

function ClientDetail({ user, onClose, onEdit, onToggle, toggling, onBook }: { user: User | null; onClose: () => void; onEdit: (u: User) => void; onToggle: (u: User) => void; toggling: boolean; onBook: (u: User) => void }) {
  const history = useQuery({
    queryKey: ['reservations', 'client-history', user?.id],
    queryFn: () => reservationsApi.list({ q: user!.phone || user!.email, sort: 'date', dir: 'desc', size: 10 }),
    enabled: !!user,
  });
  return (
    <Modal open={!!user} onClose={onClose} title={user ? `${user.firstName} ${user.lastName}` : ''} size="lg">
      {user && (
        <div className="space-y-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-400">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-400">Telefon</dt>
              <dd>{user.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-400">Client din</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-400">Vizite finalizate (după telefon)</dt>
              <dd>{user.visits ?? 0}</dd>
            </div>
          </dl>
          <div>
            <p className="mb-2 font-display text-xl font-semibold">Istoric rezervări</p>
            {history.isLoading ? (
              <Spinner />
            ) : history.data?.items.length ? (
              <ul className="divide-y divide-sand-100 rounded-xl border border-sand-200 text-sm">
                {history.data.items.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span className="font-medium">{r.serviceName}</span>
                    <span className="text-ink-500">{formatDateTime(r.startDateTime)}</span>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">Nicio rezervare.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-sand-200 pt-5">
            <Button size="sm" variant="gold" onClick={() => onBook(user)} disabled={!user.active}>
              Rezervare nouă
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onEdit(user)}>
              Modifică
            </Button>
            <Button size="sm" variant="ghost" className={user.active ? 'text-red-600 hover:bg-red-50' : ''} onClick={() => onToggle(user)} loading={toggling}>
              {user.active ? 'Dezactivează contul' : 'Reactivează contul'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ClientForm({ target, onClose }: { target: User | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const editing = target && target !== 'new' ? target : null;
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!target) return;
    setErrors({});
    setForm(editing ? { firstName: editing.firstName, lastName: editing.lastName, email: editing.email, phone: editing.phone ?? '' } : { firstName: '', lastName: '', email: '', phone: '' });
  }, [target, editing]);

  const save = useMutation({
    mutationFn: () => (editing ? usersApi.update(editing.id, form) : usersApi.create(form)),
    onSuccess: () => {
      toast.success(editing ? 'Clientul a fost actualizat.' : 'Clientul a fost creat.');
      qc.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
    onError: (e) => {
      setErrors(fieldErrors(e));
      toast.error(friendlyError(e));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.firstName.trim()) err.firstName = MSG.required;
    if (!form.lastName.trim()) err.lastName = MSG.required;
    if (!EMAIL_RE.test(form.email.trim())) err.email = MSG.email;
    if (!PHONE_RE.test(form.phone.trim())) err.phone = MSG.phone;
    setErrors(err);
    if (Object.keys(err).length === 0) save.mutate();
  };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open={!!target} onClose={onClose} title={editing ? 'Modifică client' : 'Client nou'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Prenume" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
          <TextField label="Nume" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
        </div>
        <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Telefon" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
        {!editing && <p className="text-xs text-ink-500">Clientul își poate seta parola folosind „Ai uitat parola?” la login.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Renunță
          </Button>
          <Button type="submit" loading={save.isPending}>
            Salvează
          </Button>
        </div>
      </form>
    </Modal>
  );
}
