import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

type Kind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  const icon = { success: CheckCircle2, error: XCircle, info: Info };
  const tone = {
    success: 'border-emerald-200 text-emerald-800',
    error: 'border-red-200 text-red-800',
    info: 'border-sand-300 text-ink-700',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icon[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-md animate-fade-up items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-soft ${tone[t.kind]}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p className="flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Închide" className="text-ink-400 hover:text-ink-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
