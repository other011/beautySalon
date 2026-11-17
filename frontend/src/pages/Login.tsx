import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import { friendlyError } from '../utils/errors';
import { EMAIL_RE, MSG } from '../utils/validation';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = MSG.required;
    else if (!EMAIL_RE.test(email.trim())) next.email = MSG.email;
    if (!password) next.password = 'Introdu parola.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const user = await login(email.trim(), password, remember);
      navigate(from ?? (user.role === 'ADMIN' ? '/admin' : '/cont'), { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError && err.status === 401 ? 'Email sau parolă incorectă.' : friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Bine ai revenit"
      subtitle="Autentifică-te pentru a-ți gestiona rezervările."
      footer={
        <>
          Nu ai cont?{' '}
          <Link to="/inregistrare" state={{ from }} className="font-medium text-gold-600 hover:underline">
            Înregistrează-te
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {formError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        )}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField
          label="Parolă"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-ink-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-sand-300 text-gold-500 focus:ring-gold-400" />
            Ține-mă minte
          </label>
          <Link to="/parola-uitata" className="text-gold-600 hover:underline">
            Ai uitat parola?
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Login
        </Button>
      </form>
    </AuthShell>
  );
}
