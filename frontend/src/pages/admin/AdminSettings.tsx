import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { QueryState } from '../../components/ui/States';
import { useToast } from '../../hooks/useToast';
import { settingsApi } from '../../services/endpoints';
import type { Settings } from '../../types';
import { fieldErrors, friendlyError } from '../../utils/errors';

const TIMEZONES = ['Europe/Bucharest', 'Europe/Chisinau', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'UTC'];

export default function AdminSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const [form, setForm] = useState<Settings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const save = useMutation({
    mutationFn: (s: Settings) => settingsApi.update(s),
    onSuccess: (s) => {
      toast.success('Setările au fost salvate.');
      qc.setQueryData(['settings'], s);
      qc.invalidateQueries({ queryKey: ['availability'] });
      qc.invalidateQueries({ queryKey: ['availability-days'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
    onError: (e) => {
      setErrors(fieldErrors(e));
      toast.error(friendlyError(e));
    },
  });

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const text = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never);
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const err: Record<string, string> = {};
    if (!form.salonName.trim()) err.salonName = 'Câmp obligatoriu.';
    if (!(form.cancellationHours >= 0)) err.cancellationHours = 'Valoare invalidă.';
    if (!(form.defaultDurationMinutes >= 5)) err.defaultDurationMinutes = 'Minim 5 minute.';
    if (!(form.slotStepMinutes >= 5)) err.slotStepMinutes = 'Minim 5 minute.';
    setErrors(err);
    if (Object.keys(err).length === 0) save.mutate(form);
  };

  return (
    <div>
      <PageHeader title="Setări" subtitle="Informațiile salonului și regulile de rezervare." />
      <QueryState query={query}>
        {form && (
          <form onSubmit={submit} noValidate className="grid max-w-5xl gap-8 lg:grid-cols-2">
            <section className="card space-y-4 p-6">
              <h2 className="font-display text-2xl font-semibold">Salon</h2>
              <TextField label="Numele salonului" value={form.salonName} onChange={text('salonName')} error={errors.salonName} />
              <TextField label="Slogan" value={form.tagline} onChange={text('tagline')} />
              <TextField label="Logo (URL imagine)" value={form.logoUrl} onChange={text('logoUrl')} hint="Lasă gol pentru logo-ul implicit." />
              <TextAreaField label="Descriere" value={form.description} onChange={text('description')} />
            </section>

            <section className="card space-y-4 p-6">
              <h2 className="font-display text-2xl font-semibold">Contact și locație</h2>
              <TextField label="Adresă" value={form.address} onChange={text('address')} />
              <TextField label="Oraș" value={form.city} onChange={text('city')} />
              <TextField label="Telefon" value={form.phone} onChange={text('phone')} />
              <TextField label="Email" type="email" value={form.email} onChange={text('email')} />
              <p className="text-xs text-ink-500">Harta din pagina de contact folosește această adresă. Programul se modifică din secțiunea „Program”.</p>
            </section>

            <section className="card space-y-4 p-6 lg:col-span-2">
              <h2 className="font-display text-2xl font-semibold">Reguli de rezervare</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <TextField label="Anulare / modificare cu minim (ore)" type="number" min={0} value={form.cancellationHours} onChange={num('cancellationHours')} error={errors.cancellationHours} hint="Politica de anulare pentru clienți." />
                <TextField label="Durata implicită (minute)" type="number" min={5} step={5} value={form.defaultDurationMinutes} onChange={num('defaultDurationMinutes')} error={errors.defaultDurationMinutes} hint="Folosită pentru servicii noi." />
                <TextField label="Pasul intervalelor (minute)" type="number" min={5} step={5} value={form.slotStepMinutes} onChange={num('slotStepMinutes')} error={errors.slotStepMinutes} hint="Din cât în cât încep rezervările." />
                <TextField label="Rezervări cu până la (zile)" type="number" min={1} value={form.bookingHorizonDays} onChange={num('bookingHorizonDays')} hint="Cât de departe se poate rezerva." />
                <TextField label="Monedă" value={form.currency} onChange={text('currency')} />
                <SelectField label="Fus orar" value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                  {[...new Set([form.timezone, ...TIMEZONES])].map((tz) => (
                    <option key={tz}>{tz}</option>
                  ))}
                </SelectField>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.autoConfirm} onChange={(e) => set('autoConfirm', e.target.checked)} className="h-4 w-4 rounded border-sand-300 text-gold-500 focus:ring-gold-400" />
                Confirmă automat rezervările clienților (altfel rămân „în așteptare” până le confirmi)
              </label>
            </section>

            <div className="lg:col-span-2">
              <Button type="submit" size="lg" loading={save.isPending}>
                Salvează setările
              </Button>
            </div>
          </form>
        )}
      </QueryState>
    </div>
  );
}
