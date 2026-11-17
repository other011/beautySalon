import { ApiError } from '../services/api';

const BY_CODE: Record<string, string> = {
  SLOT_TAKEN: 'Intervalul selectat tocmai a fost rezervat de altcineva. Te rugăm să alegi altă oră.',
  SLOT_BLOCKED: 'Salonul nu este disponibil la ora selectată. Te rugăm să alegi altă oră.',
  SLOT_IN_PAST: 'Ora selectată a trecut deja. Alege un alt interval.',
  INVALID_SLOT: 'Ora selectată nu este disponibilă. Alege un alt interval.',
  CANCELLATION_WINDOW: 'Rezervarea nu mai poate fi modificată sau anulată: termenul limită a trecut.',
  EMAIL_TAKEN: 'Există deja un cont cu acest email.',
  TOO_MANY_REQUESTS: 'Prea multe încercări. Te rugăm să aștepți câteva minute și să încerci din nou.',
  ACCOUNT_DISABLED: 'Acest cont a fost dezactivat.',
  WRONG_PASSWORD: 'Parola curentă este incorectă.',
  INVALID_RESET_TOKEN: 'Linkul de resetare este invalid sau a expirat.',
  INVALID_STATE: 'Această acțiune nu mai este posibilă pentru rezervarea selectată.',
  SERVICE_INACTIVE: 'Acest serviciu nu mai este disponibil pentru rezervări.',
  INVALID_HOURS: 'Ora de închidere trebuie să fie după ora de deschidere.',
  SELF_DISABLE: 'Nu îți poți dezactiva propriul cont.',
  ADMIN_PROTECTED: 'Conturile de administrator nu pot fi șterse sau dezactivate astfel.',
  VALIDATION_ERROR: 'Verifică datele introduse și încearcă din nou.',
};

export const GENERIC_ERROR = 'A apărut o problemă. Te rugăm să încerci din nou.';

/** Turns any thrown value into a message that is safe and understandable for end users. */
export function friendlyError(err: unknown, fallback = GENERIC_ERROR): string {
  if (err instanceof ApiError) {
    if (err.code && BY_CODE[err.code]) return BY_CODE[err.code];
    if (err.status === 0) return 'Nu ne-am putut conecta la server. Verifică conexiunea la internet.';
    if (err.status === 401) return 'Sesiunea a expirat. Te rugăm să te autentifici din nou.';
    if (err.status === 403) return 'Nu ai permisiunea de a efectua această acțiune.';
    if (err.status === 404) return 'Resursa căutată nu a fost găsită.';
    if (err.status >= 500) return fallback;
  }
  return fallback;
}

/** Field level validation messages returned by the API, translated for common cases. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !err.fieldErrors) return {};
  const out: Record<string, string> = {};
  for (const [field, msg] of Object.entries(err.fieldErrors)) {
    if (/phone/i.test(msg)) out[field] = 'Număr de telefon invalid.';
    else if (/password/i.test(msg) && /characters/i.test(msg)) out[field] = 'Parola trebuie să aibă minim 8 caractere, cu litere mari, mici și o cifră.';
    else if (/email/i.test(msg)) out[field] = 'Adresă de email invalidă.';
    else if (/blank|empty|null/i.test(msg)) out[field] = 'Câmp obligatoriu.';
    else out[field] = msg;
  }
  return out;
}
