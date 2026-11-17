import { describe, expect, it } from 'vitest';
import { ApiError } from '../services/api';
import { fieldErrors, friendlyError } from './errors';
import { formatDateLong, formatMoney, formatTime, parseDateTime, toISODate } from './format';
import { EMAIL_RE, PASSWORD_RE, PHONE_RE } from './validation';

describe('formatting', () => {
  it('keeps dates in local time (no UTC shift)', () => {
    expect(toISODate(new Date(2026, 9, 10, 0, 30))).toBe('2026-10-10');
    expect(parseDateTime('2026-10-10T15:30:00').getHours()).toBe(15);
    expect(formatTime('2026-10-10T09:05:00')).toBe('09:05');
    expect(formatDateLong('2026-10-10T09:00:00')).toBe('sâmbătă, 10 octombrie 2026');
  });
  it('formats prices with the currency', () => {
    expect(formatMoney(150)).toBe('150 RON');
    expect(formatMoney(99.5, 'EUR')).toBe('99.50 EUR');
  });
});

describe('validation', () => {
  it('accepts valid emails, phones and strong passwords only', () => {
    expect(EMAIL_RE.test('maria@example.com')).toBe(true);
    expect(EMAIL_RE.test('maria@')).toBe(false);
    expect(PHONE_RE.test('+40 721 123 456')).toBe(true);
    expect(PHONE_RE.test('abc')).toBe(false);
    expect(PASSWORD_RE.test('Parola123!')).toBe(true);
    expect(PASSWORD_RE.test('parola')).toBe(false);
    expect(PASSWORD_RE.test('parolafaracifra')).toBe(false);
  });
});

describe('error messages', () => {
  it('turns API error codes into user friendly Romanian text', () => {
    expect(friendlyError(new ApiError(409, 'x', 'SLOT_TAKEN'))).toContain('tocmai a fost rezervat');
    expect(friendlyError(new ApiError(403, 'x', 'CANCELLATION_WINDOW'))).toContain('termenul limită');
    expect(friendlyError(new ApiError(500, 'stack trace here'))).toBe('A apărut o problemă. Te rugăm să încerci din nou.');
    expect(friendlyError(new ApiError(0, 'x', 'NETWORK'))).toContain('conecta');
    expect(friendlyError(new Error('anything'))).toBe('A apărut o problemă. Te rugăm să încerci din nou.');
  });
  it('translates field level validation errors', () => {
    const err = new ApiError(400, 'Validation failed.', 'VALIDATION_ERROR', { phone: 'Invalid phone number.', email: 'must be a well-formed email address' });
    expect(fieldErrors(err)).toEqual({ phone: 'Număr de telefon invalid.', email: 'Adresă de email invalidă.' });
  });
});
