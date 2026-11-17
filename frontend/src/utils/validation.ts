export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^\+?[0-9][0-9 .\-()]{6,18}[0-9]$/;
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,100}$/;

export const MSG = {
  required: 'Câmp obligatoriu.',
  email: 'Introdu o adresă de email validă.',
  phone: 'Introdu un număr de telefon valid (ex: +40 721 123 456).',
  password: 'Minim 8 caractere, cu o literă mare, una mică și o cifră.',
  passwordMatch: 'Parolele nu coincid.',
};
