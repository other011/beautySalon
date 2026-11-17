import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';
import { reservationsApi, servicesApi, usersApi } from '../../services/endpoints';
import type { Reservation, ReservationStatus, User } from '../../types';
import { friendlyError } from '../../utils/errors';
import { formatMoney, formatTime, toISODate } from '../../utils/format';
import { SlotPicker } from '../booking/SlotPicker';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { ClientPicker } from './ClientPicker';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Reservation being edited; omit to create. */
  reservation?: Reservation | null;
  /** Prefill for a new reservation (e.g. from a calendar click). */
  initial?: { date?: string; time?: string; client?: User | null };
}

/** Admin create / edit form. The slot list comes from the same availability API the clients use. */
export function ReservationFormModal({ open, onClose, reservation, initial }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const services = useQuery({ queryKey: ['services', 'all'], queryFn: () => servicesApi.list(true), enabled: open });

  const [client, setClient] = useState<User | null>(null);
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState<string | null>(null);
  const [status, setStatus] = useState<ReservationStatus>('CONFIRMED');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // (re)initialise whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (reservation) {
      setServiceId(reservation.serviceId);
      setDate(reservation.startDateTime.slice(0, 10));
      setTime(formatTime(reservation.startDateTime));
      setStatus(reservation.status);
      setNotes(reservation.notes ?? '');
      setClient(null);
      if (reservation.userId !== null) usersApi.get(reservation.userId).then(setClient).catch(() => setClient(null));
    } else {
      setClient(initial?.client ?? null);
      setServiceId('');
      setDate(initial?.date ?? toISODate(new Date()));
      setTime(initial?.time ?? null);
      setStatus('CONFIRMED');
      setNotes('');
    }
  }, [open, reservation, initial]);

  const service = services.data?.find((s) => s.id === serviceId);
  const ownSlot = reservation && date === reservation.startDateTime.slice(0, 10) && serviceId === reservation.serviceId ? formatTime(reservation.startDateTime) : null;

  const save = useMutation({
    mutationFn: () => {
      const body = { serviceId: Number(serviceId), startDateTime: `${date}T${time}:00`, notes: notes.trim() || undefined, userId: client?.id, status };
      return reservation ? reservationsApi.update(reservation.id, body) : reservationsApi.create(body);
    },
    onSuccess: () => {
      toast.success(reservation ? 'Rezervarea a fost modificată.' : 'Rezervarea a fost creată.');
      for (const key of ['reservations', 'availability', 'availability-days', 'dashboard', 'audit', 'clients']) qc.invalidateQueries({ queryKey: [key] });
      onClose();
    },
    onError: (e) => {
      toast.error(friendlyError(e));
      if (e instanceof ApiError && e.code?.startsWith('SLOT')) {
        setTime(null);
        qc.invalidateQueries({ queryKey: ['availability'] });
      }
    },
  });

  const submit = () => {
    const err: Record<string, string> = {};
    if (!client && !reservation?.guest) err.client = 'Alege un client.';
    if (!serviceId) err.service = 'Alege un serviciu.';
    if (!date) err.date = 'Alege data.';
    if (!time) err.time = 'Alege ora.';
    setErrors(err);
    if (Object.keys(err).length) return;
    save.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={reservation ? `Modifică rezervarea #${reservation.id}` : 'Rezervare nouă'} size="lg">
      <div className="space-y-5">
        {reservation?.guest && !client && (
          <div className="rounded-xl border border-gold-300 bg-gold-100/50 p-4 text-sm">
            <p className="font-medium">Programare fără cont: {reservation.clientName} · {reservation.clientPhone}</p>
            <p className="text-ink-600">Rămâne fără cont. Dacă alegi un client de mai jos, rezervarea se atașează contului lui.</p>
          </div>
        )}
        <ClientPicker value={client} onChange={setClient} error={errors.client} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Serviciu"
            value={serviceId}
            error={errors.service}
            onChange={(e) => {
              setServiceId(e.target.value ? Number(e.target.value) : '');
              setTime(null);
            }}
          >
            <option value="">Alege serviciul…</option>
            {services.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} – {s.durationMinutes} min{s.active ? '' : ' (inactiv)'}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Data"
            type="date"
            value={date}
            error={errors.date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime(null);
            }}
          />
        </div>

        {serviceId && date ? (
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">Ora</p>
            <SlotPicker serviceId={Number(serviceId)} date={date} value={time} onChange={setTime} ownSlot={ownSlot} />
            {errors.time && (
              <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                {errors.time}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-500">Alege serviciul și data pentru a vedea intervalele libere.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus)}>
            <option value="PENDING">În așteptare</option>
            <option value="CONFIRMED">Confirmată</option>
            <option value="COMPLETED">Finalizată</option>
            <option value="CANCELLED">Anulată</option>
            <option value="NO_SHOW">Absent</option>
          </SelectField>
          <div className="flex items-end justify-between rounded-xl bg-sand-50 px-4 py-3 text-sm">
            <span className="text-ink-500">Total</span>
            <span className="font-display text-2xl font-semibold text-gold-600">{service ? formatMoney(service.price) : '—'}</span>
          </div>
        </div>
        <TextAreaField label="Observații" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Renunță
          </Button>
          <Button onClick={submit} loading={save.isPending}>
            {reservation ? 'Salvează' : 'Creează rezervarea'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
