import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, QueryState } from '../../components/ui/States';
import { useToast } from '../../hooks/useToast';
import { scheduleApi } from '../../services/endpoints';
import type { BlockedSlot, BlockedType, BusinessHours, Recurrence } from '../../types';
import { friendlyError } from '../../utils/errors';
import { WEEKDAYS_ISO, formatDateTime, hhmm } from '../../utils/format';

const TYPE_LABEL: Record<BlockedType, string> = {
  BREAK: 'Pauză',
  VACATION: 'Concediu',
  DAY_OFF: 'Zi liberă',
  CLOSED: 'Zi închisă',
  MAINTENANCE: 'Mentenanță',
  OTHER: 'Altele',
};
const REC_LABEL: Record<Recurrence, string> = { NONE: 'O singură dată', DAILY: 'În fiecare zi', WEEKLY: 'În fiecare săptămână' };

export default function AdminSchedule() {
  const qc = useQueryClient();
  const toast = useToast();
  const schedule = useQuery({ queryKey: ['schedule-admin'], queryFn: scheduleApi.get });
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [removing, setRemoving] = useState<BlockedSlot | null>(null);

  useEffect(() => {
    if (!schedule.data) return;
    const byDay = new Map(schedule.data.hours.map((h) => [h.dayOfWeek, h]));
    setHours(Array.from({ length: 7 }, (_, i) => byDay.get(i + 1) ?? { dayOfWeek: i + 1, openingTime: '09:00:00', closingTime: '18:00:00', active: false }));
  }, [schedule.data]);

  const refresh = () => {
    for (const key of ['schedule-admin', 'schedule-public', 'availability', 'availability-days', 'audit']) qc.invalidateQueries({ queryKey: [key] });
  };

  const saveHours = useMutation({
    mutationFn: () => scheduleApi.updateHours(hours),
    onSuccess: () => {
      toast.success('Programul a fost salvat.');
      refresh();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const removeBlocked = useMutation({
    mutationFn: (b: BlockedSlot) => scheduleApi.removeBlocked(b.id),
    onSuccess: () => {
      toast.success('Intervalul a fost eliminat.');
      setRemoving(null);
      refresh();
    },
    onError: (e) => {
      toast.error(friendlyError(e));
      setRemoving(null);
    },
  });

  const patch = (day: number, p: Partial<BusinessHours>) => setHours((hs) => hs.map((h) => (h.dayOfWeek === day ? { ...h, ...p } : h)));
  const invalid = hours.some((h) => h.active && hhmm(h.closingTime) <= hhmm(h.openingTime));

  return (
    <div>
      <PageHeader title="Program" subtitle="Orele de funcționare ale salonului și intervalele indisponibile (pauze, concedii, zile libere)." />
      <QueryState query={schedule}>
        <div className="grid gap-8 xl:grid-cols-2">
          <section className="card p-5" aria-labelledby="hours-title">
            <h2 id="hours-title" className="mb-4 font-display text-2xl font-semibold">
              Program săptămânal
            </h2>
            <ul className="space-y-3">
              {hours.map((h) => (
                <li key={h.dayOfWeek} className="flex flex-wrap items-center gap-3 rounded-xl bg-sand-50 px-4 py-3">
                  <label className="flex w-32 cursor-pointer items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={h.active} onChange={(e) => patch(h.dayOfWeek, { active: e.target.checked })} className="h-4 w-4 rounded border-sand-300 text-gold-500 focus:ring-gold-400" />
                    {WEEKDAYS_ISO[h.dayOfWeek - 1]}
                  </label>
                  {h.active ? (
                    <div className="flex items-center gap-2 text-sm">
                      <input type="time" aria-label={`Deschidere ${WEEKDAYS_ISO[h.dayOfWeek - 1]}`} className="input w-auto" value={hhmm(h.openingTime)} onChange={(e) => patch(h.dayOfWeek, { openingTime: e.target.value })} />
                      <span>–</span>
                      <input type="time" aria-label={`Închidere ${WEEKDAYS_ISO[h.dayOfWeek - 1]}`} className="input w-auto" value={hhmm(h.closingTime)} onChange={(e) => patch(h.dayOfWeek, { closingTime: e.target.value })} />
                    </div>
                  ) : (
                    <span className="text-sm text-ink-400">Închis</span>
                  )}
                </li>
              ))}
            </ul>
            {invalid && <p role="alert" className="mt-3 text-sm text-red-600">Ora de închidere trebuie să fie după ora de deschidere.</p>}
            <Button className="mt-5" onClick={() => saveHours.mutate()} loading={saveHours.isPending} disabled={invalid}>
              Salvează programul
            </Button>
          </section>

          <section className="space-y-5" aria-labelledby="blocked-title">
            <div className="card p-5">
              <h2 id="blocked-title" className="mb-4 font-display text-2xl font-semibold">
                Intervale indisponibile
              </h2>
              {schedule.data?.blockedSlots.length === 0 ? (
                <EmptyState title="Nu există intervale blocate." description="Adaugă o pauză, un concediu sau o zi liberă mai jos." />
              ) : (
                <ul className="divide-y divide-sand-100">
                  {schedule.data?.blockedSlots.map((b) => (
                    <li key={b.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                      <div className="space-y-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <Pill tone="gold">{TYPE_LABEL[b.type]}</Pill>
                          {b.recurrence !== 'NONE' && <Pill>{REC_LABEL[b.recurrence]}</Pill>}
                          {b.reason && <span className="font-medium">{b.reason}</span>}
                        </p>
                        <p className="text-ink-500">
                          {b.recurrence === 'NONE' ? `${formatDateTime(b.startDateTime)} → ${formatDateTime(b.endDateTime)}` : `${hhmm(b.startDateTime.slice(11))} – ${hhmm(b.endDateTime.slice(11))}`}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" aria-label="Elimină intervalul" className="text-red-600 hover:bg-red-50" onClick={() => setRemoving(b)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <AddBlocked onAdded={refresh} />
          </section>
        </div>
      </QueryState>

      <ConfirmDialog
        open={!!removing}
        message="Ești sigur că dorești să elimini acest interval indisponibil? Orele respective vor deveni din nou rezervabile."
        confirmLabel="Da, elimină"
        loading={removeBlocked.isPending}
        onConfirm={() => removing && removeBlocked.mutate(removing)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

function AddBlocked({ onAdded }: { onAdded: () => void }) {
  const toast = useToast();
  const [type, setType] = useState<BlockedType>('BREAK');
  const [recurrence, setRecurrence] = useState<Recurrence>('NONE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [wholeDay, setWholeDay] = useState(false);
  const [until, setUntil] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => {
      const recurring = recurrence !== 'NONE';
      const st = wholeDay && !recurring ? '00:00' : startTime;
      const et = wholeDay && !recurring ? '23:59' : endTime;
      return scheduleApi.addBlocked({
        type,
        recurrence,
        startDateTime: `${startDate}T${st}:00`,
        endDateTime: `${recurring ? startDate : endDate || startDate}T${et}:00`,
        reason: reason.trim() || null,
        recurrenceUntil: recurring && until ? until : null,
      });
    },
    onSuccess: () => {
      toast.success('Intervalul a fost adăugat.');
      setReason('');
      onAdded();
    },
    onError: (e) => setError(friendlyError(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!startDate) return setError('Alege data de început.');
    if (!wholeDay || recurrence !== 'NONE') {
      if (endTime <= startTime && (recurrence !== 'NONE' || !endDate || endDate === startDate)) return setError('Ora de sfârșit trebuie să fie după ora de început.');
    }
    if (recurrence === 'NONE' && endDate && endDate < startDate) return setError('Data de sfârșit trebuie să fie după data de început.');
    add.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5">
      <h3 className="font-display text-xl font-semibold">Adaugă interval indisponibil</h3>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Tip" value={type} onChange={(e) => setType(e.target.value as BlockedType)}>
          {(Object.keys(TYPE_LABEL) as BlockedType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Repetare" value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
          {(Object.keys(REC_LABEL) as Recurrence[]).map((r) => (
            <option key={r} value={r}>
              {REC_LABEL[r]}
            </option>
          ))}
        </SelectField>
        <TextField label={recurrence === 'NONE' ? 'De la data' : 'Începând cu data'} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        {recurrence === 'NONE' ? <TextField label="Până la data" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} /> : <TextField label="Repetă până la (opțional)" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />}
      </div>
      {recurrence === 'NONE' && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={wholeDay} onChange={(e) => setWholeDay(e.target.checked)} className="h-4 w-4 rounded border-sand-300 text-gold-500 focus:ring-gold-400" />
          Toată ziua (zi liberă / concediu)
        </label>
      )}
      {(!wholeDay || recurrence !== 'NONE') && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="De la ora" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <TextField label="Până la ora" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      )}
      <TextField label="Motiv (opțional)" placeholder="ex: Pauză de masă" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button type="submit" loading={add.isPending}>
        Adaugă
      </Button>
    </form>
  );
}
