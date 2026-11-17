import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { reservationsApi } from '../../services/endpoints';
import type { Reservation } from '../../types';
import { friendlyError } from '../../utils/errors';
import { formatDateLong, formatMoney, formatTime } from '../../utils/format';
import { Pill, StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConfirmDialog, Modal } from '../ui/Modal';

interface Props {
  reservation: Reservation | null;
  onClose: () => void;
  onEdit: (r: Reservation) => void;
}

type Action = 'confirm' | 'complete' | 'noShow' | 'cancel' | 'remove';

const CONFIRM_TEXT: Partial<Record<Action, { message: string; label: string }>> = {
  cancel: { message: 'Ești sigur că dorești să anulezi această rezervare? Clientul va fi notificat.', label: 'Da, anulează' },
  remove: { message: 'Ești sigur că dorești să ștergi definitiv această rezervare? Acțiunea nu poate fi anulată.', label: 'Da, șterge' },
  noShow: { message: 'Marchezi clientul ca absent?', label: 'Da, marchează absent' },
};

/** Details of a reservation with every admin action (confirm, complete, no-show, cancel, edit, delete). */
export function ReservationDetailModal({ reservation: r, onClose, onEdit }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const [pending, setPending] = useState<Action | null>(null);

  const run = useMutation<unknown, Error, Action>({
    mutationFn: (action: Action) => {
      if (!r) throw new Error('no reservation');
      switch (action) {
        case 'confirm':
          return reservationsApi.confirm(r.id);
        case 'complete':
          return reservationsApi.complete(r.id);
        case 'noShow':
          return reservationsApi.noShow(r.id);
        case 'cancel':
          return reservationsApi.cancel(r.id);
        case 'remove':
          return reservationsApi.remove(r.id);
      }
    },
    onSuccess: (_d, action) => {
      toast.success(
        { confirm: 'Rezervarea a fost confirmată.', complete: 'Rezervarea a fost marcată ca finalizată.', noShow: 'Rezervarea a fost marcată ca absent.', cancel: 'Rezervarea a fost anulată.', remove: 'Rezervarea a fost ștearsă.' }[action],
      );
      for (const key of ['reservations', 'availability', 'availability-days', 'dashboard', 'audit']) qc.invalidateQueries({ queryKey: [key] });
      setPending(null);
      onClose();
    },
    onError: (e) => {
      toast.error(friendlyError(e));
      setPending(null);
    },
  });

  const trigger = (a: Action) => (CONFIRM_TEXT[a] ? setPending(a) : run.mutate(a));
  const open = r?.status === 'PENDING' || r?.status === 'CONFIRMED';

  return (
    <>
      <Modal open={!!r} onClose={onClose} title={r ? `Rezervarea #${r.id}` : ''}>
        {r && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl font-semibold">{r.serviceName}</p>
              <StatusBadge status={r.status} />
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Client</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-ink-800">
                  {r.clientName}
                  {r.guest ? <Pill tone="gold">Fără cont</Pill> : <Pill tone="green">Cu cont</Pill>}
                </dd>
              </div>
              {r.visitCount !== null && <Info label="Vizite (după telefon)" value={r.visitCount === 0 ? 'prima vizită' : `${r.visitCount} ${r.visitCount === 1 ? 'vizită finalizată' : 'vizite finalizate'}`} />}
              <Info label="Data" value={formatDateLong(r.startDateTime)} />
              <Info label="Interval" value={`${formatTime(r.startDateTime)} – ${formatTime(r.endDateTime)} (${r.durationMinutes} min)`} />
              <Info label="Preț" value={formatMoney(r.price)} />
            </dl>
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-600">
              {r.clientEmail && (
                <a href={`mailto:${r.clientEmail}`} className="inline-flex items-center gap-1.5 hover:text-gold-600">
                  <Mail className="h-4 w-4" /> {r.clientEmail}
                </a>
              )}
              {r.clientPhone && (
                <a href={`tel:${r.clientPhone}`} className="inline-flex items-center gap-1.5 hover:text-gold-600">
                  <Phone className="h-4 w-4" /> {r.clientPhone}
                </a>
              )}
            </p>
            {r.notes && <p className="rounded-xl bg-sand-50 p-3 text-sm text-ink-700">{r.notes}</p>}

            <div className="flex flex-wrap gap-2 border-t border-sand-200 pt-5">
              {r.status === 'PENDING' && (
                <Button size="sm" variant="gold" onClick={() => trigger('confirm')} loading={run.isPending && run.variables === 'confirm'}>
                  Confirmă
                </Button>
              )}
              {open && (
                <>
                  <Button size="sm" onClick={() => trigger('complete')} loading={run.isPending && run.variables === 'complete'}>
                    Marchează finalizată
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => trigger('noShow')}>
                    Absent
                  </Button>
                </>
              )}
              <Button size="sm" variant="secondary" onClick={() => onEdit(r)}>
                Modifică
              </Button>
              {open && (
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => trigger('cancel')}>
                  Anulează
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => trigger('remove')}>
                Șterge
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={!!pending}
        message={pending ? CONFIRM_TEXT[pending]!.message : ''}
        confirmLabel={pending ? CONFIRM_TEXT[pending]!.label : ''}
        loading={run.isPending}
        onConfirm={() => pending && run.mutate(pending)}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{value}</dd>
    </div>
  );
}
