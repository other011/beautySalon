import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/useToast';
import { reservationsApi } from '../services/endpoints';
import type { Reservation } from '../types';
import { friendlyError } from '../utils/errors';
import { formatDateTime } from '../utils/format';
import { ConfirmDialog } from './ui/Modal';

interface Props {
  reservation: Reservation | null;
  onClose: () => void;
  onCancelled?: (r: Reservation) => void;
}

/** Confirmation + request for cancelling a reservation (works for clients and admins). */
export function CancelReservationDialog({ reservation, onClose, onCancelled }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: (id: number) => reservationsApi.cancel(id),
    onSuccess: (r) => {
      toast.success('Rezervarea ta a fost anulată.');
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
      qc.invalidateQueries({ queryKey: ['availability-days'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      onCancelled?.(r);
      onClose();
    },
    onError: (e) => {
      toast.error(friendlyError(e));
      onClose();
    },
  });

  return (
    <ConfirmDialog
      open={!!reservation}
      title="Anulare rezervare"
      message={`Ești sigur că dorești să anulezi această rezervare?${reservation ? ` (${reservation.serviceName}, ${formatDateTime(reservation.startDateTime)})` : ''}`}
      confirmLabel="Da, anulează"
      cancelLabel="Renunță"
      loading={mutation.isPending}
      onConfirm={() => reservation && mutation.mutate(reservation.id)}
      onCancel={onClose}
    />
  );
}
