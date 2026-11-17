import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { authApi } from '../services/endpoints';
import { friendlyError } from '../utils/errors';
import { EMAIL_RE, MSG } from '../utils/validation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError(MSG.email);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Ai uitat parola?"
      subtitle="Îți trimitem un link pentru a seta o parolă nouă."
      footer={
        <Link to="/login" className="font-medium text-gold-600 hover:underline">
          ← Înapoi la login
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Dacă există un cont cu această adresă, vei primi în scurt timp un email cu instrucțiuni.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error ?? undefined} />
          <Button type="submit" className="w-full" loading={loading}>
            Trimite linkul
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
