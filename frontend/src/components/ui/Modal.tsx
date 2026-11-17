import { X } from 'lucide-react';
import { ReactNode, useEffect, useId, useRef } from 'react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const WIDTH = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

export function Modal({ open, title, onClose, children, size = 'md' }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full animate-fade-up flex-col rounded-t-3xl bg-white shadow-soft sm:rounded-3xl ${WIDTH[size]}`}
      >
        <div className="flex items-center justify-between border-b border-sand-200 px-6 py-4">
          <h2 id={titleId} className="font-display text-2xl font-semibold">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Închide" className="rounded-full p-2 text-ink-500 hover:bg-sand-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation for destructive / important actions, e.g. "Ești sigur că dorești să anulezi această rezervare?". */
export function ConfirmDialog({
  open,
  title = 'Confirmare',
  message,
  confirmLabel,
  cancelLabel = 'Renunță',
  danger = true,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm">
      <p className="text-ink-600">{message}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
