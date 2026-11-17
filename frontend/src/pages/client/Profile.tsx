import { useQuery } from '@tanstack/react-query';
import { Download, LogOut } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { reservationsApi, usersApi } from '../../services/endpoints';
import { fieldErrors, friendlyError } from '../../utils/errors';
import { formatDateTime } from '../../utils/format';
import { StatusBadge } from '../../components/ui/Badge';
import { EMAIL_RE, MSG, PASSWORD_RE, PHONE_RE } from '../../utils/validation';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', email: user?.email ?? '', phone: user?.phone ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSaving, setPwSaving] = useState(false);

  const [confirmErase, setConfirmErase] = useState(false);
  const [erasing, setErasing] = useState(false);

  const history = useQuery({ queryKey: ['reservations', 'history-preview'], queryFn: () => reservationsApi.list({ sort: 'date', dir: 'desc', size: 8 }) });

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = MSG.required;
    if (!form.lastName.trim()) next.lastName = MSG.required;
    if (!EMAIL_RE.test(form.email.trim())) next.email = MSG.email;
    if (!PHONE_RE.test(form.phone.trim())) next.phone = MSG.phone;
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const updated = await usersApi.update(user.id, { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone.trim() });
      setUser(updated);
      toast.success('Profilul a fost actualizat.');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!pw.current) next.current = 'Introdu parola curentă.';
    if (!PASSWORD_RE.test(pw.next)) next.next = MSG.password;
    if (pw.confirm !== pw.next) next.confirm = MSG.passwordMatch;
    setPwErrors(next);
    if (Object.keys(next).length) return;
    setPwSaving(true);
    try {
      await usersApi.changePassword(user.id, pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      toast.success('Parola a fost schimbată.');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setPwSaving(false);
    }
  };

  const exportData = async () => {
    try {
      const data = await usersApi.export(user.id);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'datele-mele.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  const erase = async () => {
    setErasing(true);
    try {
      await usersApi.erase(user.id);
      await logout();
      toast.success('Contul a fost închis, iar datele tale personale au fost șterse.');
      navigate('/');
    } catch (err) {
      toast.error(friendlyError(err));
      setErasing(false);
      setConfirmErase(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="container-page max-w-4xl py-12">
      <PageHeader eyebrow="Contul meu" title="Profil" />
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={saveProfile} noValidate className="card space-y-4 p-6">
          <h2 className="font-display text-2xl font-semibold">Date personale</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Prenume" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
            <TextField label="Nume" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
          </div>
          <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <TextField label="Telefon" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
          <Button type="submit" loading={saving}>
            Salvează
          </Button>
        </form>

        <form onSubmit={changePassword} noValidate className="card space-y-4 p-6">
          <h2 className="font-display text-2xl font-semibold">Schimbă parola</h2>
          <TextField label="Parola curentă" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwErrors.current} />
          <TextField label="Parola nouă" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwErrors.next} />
          <TextField label="Confirmare parolă nouă" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErrors.confirm} />
          <Button type="submit" loading={pwSaving}>
            Schimbă parola
          </Button>
        </form>
      </div>

      <section className="card mt-8 p-6" aria-labelledby="hist">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="hist" className="font-display text-2xl font-semibold">
            Istoric rezervări
          </h2>
          <Link to="/rezervarile-mele" className="text-sm font-medium text-gold-600 hover:underline">
            Vezi toate →
          </Link>
        </div>
        {history.data?.items.length ? (
          <ul className="divide-y divide-sand-200">
            {history.data.items.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-medium">{r.serviceName}</span>
                <span className="text-ink-500">{formatDateTime(r.startDateTime)}</span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">Nu există rezervări în istoric.</p>
        )}
      </section>

      <section className="card mt-8 space-y-4 p-6" aria-labelledby="privacy">
        <h2 id="privacy" className="font-display text-2xl font-semibold">
          Confidențialitate și date personale
        </h2>
        <p className="text-sm text-ink-600">
          Ai dreptul să primești o copie a datelor tale și să ceri ștergerea lor. Detalii în{' '}
          <Link to="/politica-confidentialitate" className="text-gold-600 underline">
            Politica de confidențialitate
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportData}>
            <Download className="h-4 w-4" /> Descarcă datele mele
          </Button>
          <Button variant="danger" onClick={() => setConfirmErase(true)}>
            Șterge contul și datele
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmErase}
        title="Ștergere cont"
        message="Contul tău va fi închis, datele personale șterse, iar rezervările viitoare anulate. Acțiunea nu poate fi anulată. Ești sigur?"
        confirmLabel="Da, șterge contul"
        loading={erasing}
        onConfirm={erase}
        onCancel={() => setConfirmErase(false)}
      />
    </div>
  );
}
