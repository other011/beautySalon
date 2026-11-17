import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { fieldErrors, friendlyError } from '../utils/errors';
import { EMAIL_RE, MSG, PASSWORD_RE, PHONE_RE } from '../utils/validation';

type Form = { firstName: string; lastName: string; email: string; phone: string; password: string; confirm: string };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [form, setForm] = useState<Form>({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = MSG.required;
    if (!form.lastName.trim()) e.lastName = MSG.required;
    if (!EMAIL_RE.test(form.email.trim())) e.email = MSG.email;
    if (!PHONE_RE.test(form.phone.trim())) e.phone = MSG.phone;
    if (!PASSWORD_RE.test(form.password)) e.password = MSG.password;
    if (form.confirm !== form.password) e.confirm = MSG.passwordMatch;
    if (!accept) e.accept = 'Trebuie să accepți termenii și politica de confidențialitate.';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        acceptTerms: accept,
      });
      navigate(from ?? '/cont', { replace: true });
    } catch (err) {
      const server = fieldErrors(err);
      if (Object.keys(server).length) setErrors(server);
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Creează-ți contul"
      subtitle="Programează-te online în câteva clickuri."
      footer={
        <>
          Ai deja cont?{' '}
          <Link to="/login" state={{ from }} className="font-medium text-gold-600 hover:underline">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Prenume" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
          <TextField label="Nume" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
        </div>
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Număr de telefon" type="tel" autoComplete="tel" placeholder="+40 721 123 456" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <TextField
          label="Parolă"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="Minim 8 caractere, cu literă mare, literă mică și cifră."
        />
        <TextField label="Confirmare parolă" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-600">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-sand-300 text-gold-500 focus:ring-gold-400" />
            <span>
              Sunt de acord cu{' '}
              <Link to="/termeni-conditii" target="_blank" className="text-gold-600 underline">
                Termenii și condițiile
              </Link>{' '}
              și cu prelucrarea datelor conform{' '}
              <Link to="/politica-confidentialitate" target="_blank" className="text-gold-600 underline">
                Politicii de confidențialitate
              </Link>
              .
            </span>
          </label>
          {errors.accept && (
            <p role="alert" className="mt-1 text-xs font-medium text-red-600">
              {errors.accept}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Creează cont
        </Button>
      </form>
    </AuthShell>
  );
}
