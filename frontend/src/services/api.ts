/** Thin fetch wrapper: JSON in/out, bearer token handling and a typed error. */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const TOKEN_KEY = 'salon_token';
export const AUTH_EXPIRED_EVENT = 'salon:auth-expired';

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string, remember: boolean) {
    try {
      this.clear();
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode): the session just won't survive a reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

type Query = Record<string, string | number | boolean | undefined | null>;

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Do not treat a 401 as "session expired" (used by the login form). */
  anonymous?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  });
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ''}`;
}

export async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Nu ne-am putut conecta la server.', 'NETWORK');
  }

  if (res.status === 204 || res.status === 202) return undefined as T;

  const text = await res.text();
  let data: any = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    if (res.status === 401 && token && !opts.anonymous) {
      tokenStore.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(res.status, data?.message ?? res.statusText, data?.code, data?.errors);
  }
  return data as T;
}

/** Download a text file (CSV export) using the authenticated session. */
export async function download(path: string, query: Query, filename: string) {
  const token = tokenStore.get();
  const res = await fetch(buildUrl(path, query), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(res.status, 'Export eșuat.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
