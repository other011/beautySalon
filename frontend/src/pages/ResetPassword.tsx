import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { useToast } from '../hooks/useToast';
import { authApi } from '../services/endpoints';
import { friendlyError } from '../utils/errors';
import { MSG, PASSWORD_RE } from '../utils/validation';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!PASSWORD_RE.test(password)) next.password = MSG.password;
    if (confirm !== password) next.confirm = MSG.passwordMatch;
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Parola a fost schimbată. Te poți autentifica.');
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Link invalid" subtitle="Linkul de resetare lipsește sau este incomplet.">
        <Link to="/parola-uitata" className="font-medium text-gold-600 hover:underline">
          Solicită un link nou
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Parolă nouă" subtitle="Alege o parolă sigură pentru contul tău.">
      <form onSubmit={submit} noValidate className="space-y-5">
        {formError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        )}
        <TextField label="Parolă nouă" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <TextField label="Confirmare parolă" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <Button type="submit" className="w-full" loading={loading}>
          Salvează parola
        </Button>
      </form>
    </AuthShell>
  );
}
