import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { usersApi } from '../../services/endpoints';
import type { User } from '../../types';
import { fieldErrors, friendlyError } from '../../utils/errors';
import { EMAIL_RE, MSG, PHONE_RE } from '../../utils/validation';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';

interface Props {
  value: User | null;
  onChange: (u: User | null) => void;
  error?: string;
}

/** Search an existing client by name / e-mail / phone, or create a new one on the spot. */
export function ClientPicker({ value, onChange, error }: Props) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const results = useQuery({
    queryKey: ['clients', 'picker', debounced],
    queryFn: () => usersApi.list(debounced, 0, 6),
    enabled: !value && debounced.length >= 2,
  });

  if (value) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink-700">Client</p>
        <div className="flex items-center justify-between rounded-xl border border-sand-300 bg-sand-50 px-4 py-2.5 text-sm">
          <span>
            <span className="font-medium">
              {value.firstName} {value.lastName}
            </span>
            <span className="ml-2 text-ink-500">{value.phone || value.email}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} aria-label="Schimbă clientul" className="rounded-full p-1 text-ink-500 hover:bg-sand-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const create = async () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = MSG.required;
    if (!form.lastName.trim()) e.lastName = MSG.required;
    if (!EMAIL_RE.test(form.email.trim())) e.email = MSG.email;
    if (!PHONE_RE.test(form.phone.trim())) e.phone = MSG.phone;
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const u = await usersApi.create({ ...form, email: form.email.trim(), phone: form.phone.trim() });
      qc.invalidateQueries({ queryKey: ['clients'] });
      onChange(u);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-2">
      {!creating ? (
        <>
          <div className="space-y-1.5">
            <label htmlFor="client-search" className="block text-sm font-medium text-ink-700">
              Client
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <input id="client-search" className={`input pl-10 ${error ? 'input-error' : ''}`} placeholder="Caută după nume, email sau telefon…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {error && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {error}
              </p>
            )}
          </div>
          {debounced.length >= 2 && (
            <ul className="overflow-hidden rounded-xl border border-sand-200 bg-white text-sm" aria-label="Rezultate clienți">
              {results.isLoading && <li className="px-4 py-3 text-ink-500">Se caută…</li>}
              {results.data?.items.length === 0 && <li className="px-4 py-3 text-ink-500">Niciun client găsit.</li>}
              {results.data?.items.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => onChange(u)} className="flex w-full justify-between gap-3 px-4 py-2.5 text-left hover:bg-sand-50">
                    <span className="font-medium">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="text-ink-500">{u.phone || u.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" /> Client nou
          </Button>
        </>
      ) : (
        <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50 p-4">
          <p className="text-sm font-medium">Client nou</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Prenume" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
            <TextField label="Nume" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
          </div>
          <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <TextField label="Telefon" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={create} loading={saving}>
              Creează client
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Renunță
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
