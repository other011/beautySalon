import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';

const KEY = 'salon_cookie_consent';

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** The app only uses strictly necessary storage (login session, this choice), so consent is informational. */
export function CookieBanner() {
  const [visible, setVisible] = useState(() => read() === null);
  if (!visible) return null;
  const choose = (value: string) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };
  return (
    <div role="dialog" aria-label="Cookie-uri" className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-sand-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-ink-600">
          Folosim doar cookie-uri / stocare locală strict necesare (sesiunea de autentificare). Detalii în{' '}
          <Link to="/politica-cookie" className="font-medium text-gold-600 underline">
            Politica de cookie-uri
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => choose('necessary')}>
            Doar necesare
          </Button>
          <Button size="sm" onClick={() => choose('accepted')}>
            Am înțeles
          </Button>
        </div>
      </div>
    </div>
  );
}
