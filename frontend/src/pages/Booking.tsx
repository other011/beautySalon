import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DatePicker } from '../components/booking/DatePicker';
import { SlotPicker } from '../components/booking/SlotPicker';
import { PageHeader } from '../components/PageHeader';
import { ServiceIcon } from '../components/ServiceIcon';
import { Button } from '../components/ui/Button';
import { TextAreaField, TextField } from '../components/ui/Field';
import { EmptyState, QueryState, Spinner } from '../components/ui/States';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../services/api';
import { reservationsApi, servicesApi } from '../services/endpoints';
import type { SalonServiceItem } from '../types';
import { fieldErrors, friendlyError } from '../utils/errors';
import { MSG, PHONE_RE } from '../utils/validation';
import { formatDateLong, formatMoney, formatTime } from '../utils/format';

const STEPS = ['Serviciu', 'Data', 'Ora', 'Confirmare'];

/** Booking wizard: service → date → time → confirmation. Also used (with :id) to reschedule an existing reservation. */
export default function Booking() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { settings } = useSettings();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  // booking without an account: only name, surname and phone are needed
  const [guest, setGuest] = useState({ firstName: '', lastName: '', phone: '' });
  const [guestAccept, setGuestAccept] = useState(false);
  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({});

  const services = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.list() });
  const existing = useQuery({
    queryKey: ['reservation', editId],
    queryFn: () => reservationsApi.get(editId!),
    enabled: editId !== null,
  });

  const preselected = Number(search.get('serviceId')) || null;
  const [step, setStep] = useState(preselected ? 2 : 1);
  const [serviceId, setServiceId] = useState<number | null>(preselected);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // load the reservation being edited
  useEffect(() => {
    const r = existing.data;
    if (!r) return;
    setServiceId(r.serviceId);
    setDate(r.startDateTime.slice(0, 10));
    setTime(formatTime(r.startDateTime));
    setNotes(r.notes ?? '');
    setStep(2);
  }, [existing.data]);

  const service: SalonServiceItem | undefined = services.data?.find((s) => s.id === serviceId);

  const submit = useMutation({
    mutationFn: async () => {
      const body = { serviceId: serviceId!, startDateTime: `${date}T${time}:00`, notes: notes.trim() || undefined };
      if (!user) {
        return reservationsApi.createGuest({ ...body, firstName: guest.firstName.trim(), lastName: guest.lastName.trim(), phone: guest.phone.trim(), acceptTerms: guestAccept });
      }
      return editId ? reservationsApi.update(editId, body) : reservationsApi.create(body);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['reservation'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
      qc.invalidateQueries({ queryKey: ['availability-days'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(editId ? 'Rezervarea ta a fost modificată.' : 'Rezervarea ta a fost creată cu succes.');
      if (!user) {
        navigate('/rezervare/confirmata', { state: { result: r, name: guest.firstName.trim() } });
        return;
      }
      navigate(`/rezervari/${r.id}`, { state: { created: !editId } });
    },
    onError: (e) => {
      setError(friendlyError(e));
      if (!user) setGuestErrors(fieldErrors(e));
      // somebody else took the slot (or it was blocked meanwhile): refresh and let the user pick again
      if (e instanceof ApiError && (e.code === 'SLOT_TAKEN' || e.code === 'SLOT_BLOCKED' || e.code === 'INVALID_SLOT')) {
        setTime(null);
        setStep(3);
        qc.invalidateQueries({ queryKey: ['availability'] });
        qc.invalidateQueries({ queryKey: ['availability-days'] });
      }
    },
  });

  const submitBooking = () => {
    if (!user) {
      const err: Record<string, string> = {};
      if (!guest.firstName.trim()) err.firstName = MSG.required;
      if (!guest.lastName.trim()) err.lastName = MSG.required;
      if (!PHONE_RE.test(guest.phone.trim())) err.phone = MSG.phone;
      if (!guestAccept) err.accept = 'Trebuie să accepți termenii și politica de confidențialitate.';
      setGuestErrors(err);
      if (Object.keys(err).length) return;
    }
    submit.mutate();
  };

  const canReach = (n: number) => (n === 1 ? true : n === 2 ? !!serviceId : n === 3 ? !!serviceId && !!date : !!serviceId && !!date && !!time);
  const ownSlot = existing.data && date === existing.data.startDateTime.slice(0, 10) && serviceId === existing.data.serviceId ? formatTime(existing.data.startDateTime) : null;

  const pickService = (s: SalonServiceItem) => {
    if (s.id !== serviceId) {
      setServiceId(s.id);
      setDate(null);
      setTime(null);
    }
    setError(null);
    setStep(2);
  };

  if (authLoading) return <Spinner label="Se verifică sesiunea…" />;

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow={editId ? 'Modificare rezervare' : 'Rezervare online'}
        title={editId ? 'Modifică rezervarea' : 'Programează o rezervare'}
        subtitle="Alege serviciul, ziua și ora. Disponibilitatea se actualizează în timp real."
      />

      {editId !== null && <QueryState query={existing}>{null}</QueryState>}

      <ol className="mb-10 flex items-center justify-between gap-2 sm:justify-start sm:gap-6" aria-label="Pași rezervare">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                disabled={!canReach(n)}
                onClick={() => setStep(n)}
                aria-current={active ? 'step' : undefined}
                className="flex items-center gap-2 disabled:cursor-not-allowed"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                    active ? 'bg-ink-800 text-white' : done ? 'bg-gold-500 text-white' : 'bg-sand-200 text-ink-500'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : n}
                </span>
                <span className={`hidden text-sm font-medium sm:inline ${active ? 'text-ink-900' : 'text-ink-500'}`}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {step === 1 && (
            <section aria-labelledby="step1">
              <h2 id="step1" className="mb-4 font-display text-2xl font-semibold">
                1. Alege serviciul
              </h2>
              <QueryState query={services}>
                {services.data?.length === 0 ? (
                  <EmptyState title="Momentan nu există servicii disponibile." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {services.data?.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => pickService(s)}
                        aria-pressed={serviceId === s.id}
                        className={`card flex items-start gap-4 p-5 text-left transition hover:border-gold-400 ${serviceId === s.id ? 'border-gold-500 ring-2 ring-gold-300/60' : ''}`}
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
                          <ServiceIcon name={s.icon} />
                        </span>
                        <span className="space-y-1">
                          <span className="block font-display text-xl font-semibold">{s.name}</span>
                          <span className="flex items-center gap-3 text-sm text-ink-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" aria-hidden /> {s.durationMinutes} min
                            </span>
                            <span className="font-medium text-ink-800">{formatMoney(s.price, settings.currency)}</span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </QueryState>
            </section>
          )}

          {step === 2 && serviceId && (
            <section aria-labelledby="step2">
              <h2 id="step2" className="mb-4 font-display text-2xl font-semibold">
                2. Alege data
              </h2>
              <DatePicker
                serviceId={serviceId}
                value={date}
                onChange={(d) => {
                  setDate(d);
                  setTime(null);
                  setError(null);
                  setStep(3);
                }}
              />
            </section>
          )}

          {step === 3 && serviceId && date && (
            <section aria-labelledby="step3">
              <h2 id="step3" className="mb-1 font-display text-2xl font-semibold">
                3. Alege ora
              </h2>
              <p className="mb-4 text-sm text-ink-500">{formatDateLong(date)}</p>
              <SlotPicker
                serviceId={serviceId}
                date={date}
                value={time}
                ownSlot={ownSlot}
                onChange={(t) => {
                  setTime(t);
                  setError(null);
                  setStep(4);
                }}
              />
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => setStep(2)}>
                ← Schimbă data
              </Button>
            </section>
          )}

          {step === 4 && service && date && time && (
            <section aria-labelledby="step4" className="space-y-5">
              <h2 id="step4" className="font-display text-2xl font-semibold">
                4. Confirmă rezervarea
              </h2>
              {!user && (
                <div className="space-y-4 rounded-2xl border border-sand-200 bg-white p-5" data-testid="guest-form">
                  <div>
                    <p className="font-medium">Datele tale de contact</p>
                    <p className="text-sm text-ink-500">
                      Nu ai nevoie de cont. Ai deja unul?{' '}
                      <Link to="/login" state={{ from: location.pathname + location.search }} className="font-medium text-gold-600 hover:underline">
                        Autentifică-te
                      </Link>
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Prenume" autoComplete="given-name" value={guest.firstName} onChange={(e) => setGuest({ ...guest, firstName: e.target.value })} error={guestErrors.firstName} />
                    <TextField label="Nume" autoComplete="family-name" value={guest.lastName} onChange={(e) => setGuest({ ...guest, lastName: e.target.value })} error={guestErrors.lastName} />
                  </div>
                  <TextField label="Număr de telefon" type="tel" autoComplete="tel" placeholder="+40 721 123 456" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} error={guestErrors.phone} hint="Te recunoaștem după numărul de telefon și te sunăm dacă e nevoie." />
                  <div>
                    <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-600">
                      <input type="checkbox" checked={guestAccept} onChange={(e) => setGuestAccept(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-sand-300 text-gold-500 focus:ring-gold-400" />
                      <span>
                        Sunt de acord cu <Link to="/termeni-conditii" target="_blank" className="text-gold-600 underline">Termenii și condițiile</Link> și cu prelucrarea datelor conform <Link to="/politica-confidentialitate" target="_blank" className="text-gold-600 underline">Politicii de confidențialitate</Link>.
                      </span>
                    </label>
                    {guestErrors.accept && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{guestErrors.accept}</p>}
                  </div>
                </div>
              )}
              <TextAreaField label="Observații (opțional)" maxLength={1000} placeholder="Alergii, preferințe sau alte detalii utile…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" loading={submit.isPending} onClick={submitBooking}>
                  {editId ? 'Salvează modificările' : 'Confirmă rezervarea'}
                </Button>
                <Button size="lg" variant="secondary" onClick={() => setStep(3)} disabled={submit.isPending}>
                  Înapoi
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside aria-label="Sumar rezervare" className="lg:sticky lg:top-28 lg:self-start">
          <div className="card space-y-4 p-6">
            <p className="font-display text-xl font-semibold">Sumarul rezervării</p>
            <dl className="space-y-3 text-sm">
              <Row label="Serviciu" value={service?.name} />
              <Row label="Durată" value={service ? `${service.durationMinutes} min` : undefined} />
              <Row label="Data" value={date ? formatDateLong(date) : undefined} />
              <Row label="Ora" value={time ?? undefined} />
            </dl>
            <div className="flex items-baseline justify-between border-t border-sand-200 pt-4">
              <span className="text-sm text-ink-500">Total</span>
              <span className="font-display text-3xl font-semibold text-gold-600" data-testid="total">
                {service ? formatMoney(service.price, settings.currency) : '—'}
              </span>
            </div>
            <p className="text-xs text-ink-500">Plata se face în salon. Poți anula sau modifica rezervarea cu minimum {settings.cancellationHours} ore înainte.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className={`text-right font-medium ${value ? 'text-ink-800' : 'text-ink-300'}`}>{value ?? '—'}</dd>
    </div>
  );
}
