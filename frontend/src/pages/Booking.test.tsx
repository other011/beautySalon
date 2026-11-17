import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api';
import { authApi, availabilityApi, reservationsApi } from '../services/endpoints';
import { clientFixture, renderPage, reservationFixture, servicesFixture, settingsFixture } from '../test/utils';
import type { DayAvailability, DaySummary } from '../types';
import Booking from './Booking';

vi.mock('../services/endpoints', () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
  settingsApi: { get: vi.fn(async () => settingsFixture) },
  servicesApi: { list: vi.fn(async () => servicesFixture) },
  availabilityApi: { days: vi.fn(), day: vi.fn() },
  reservationsApi: { create: vi.fn(), createGuest: vi.fn(), update: vi.fn(), get: vi.fn() },
}));

// "today" is Wednesday 21 October 2026
const days: DaySummary[] = Array.from({ length: 31 }, (_, i) => {
  const d = i + 1;
  const date = `2026-10-${String(d).padStart(2, '0')}`;
  const weekday = new Date(2026, 9, d).getDay();
  const open = d >= 21 && weekday !== 0 && d !== 23; // 23rd is fully booked, Sundays closed
  return { date, available: open, freeSlots: open ? 8 : 0 };
});

const day22: DayAvailability = {
  date: '2026-10-22',
  serviceId: 3,
  durationMinutes: 60,
  open: true,
  openingTime: '09:00:00',
  closingTime: '18:00:00',
  slots: [
    { start: '09:00:00', end: '10:00:00', available: true, reason: null },
    { start: '10:00:00', end: '11:00:00', available: false, reason: 'BOOKED' },
    { start: '12:00:00', end: '13:00:00', available: false, reason: 'BLOCKED' },
    { start: '15:00:00', end: '16:00:00', available: true, reason: null },
  ],
};

describe('Booking flow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0, 0));
    vi.mocked(availabilityApi.days).mockResolvedValue(days);
    vi.mocked(availabilityApi.day).mockResolvedValue(day22);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /** Renders the booking page as a logged in client (default) or as a visitor without an account. */
  const setup = (loggedIn = true) => {
    if (loggedIn) {
      sessionStorage.setItem('salon_token', 'jwt');
      vi.mocked(authApi.me).mockResolvedValue(clientFixture);
    }
    return renderPage(<Booking />, {
      route: '/rezervare',
      path: '/rezervare',
      extraRoutes: [
        { path: '/rezervari/:id', element: <p>Rezervarea a fost creată</p> },
        { path: '/rezervare/confirmata', element: <p>Mulțumim pentru rezervare</p> },
      ],
    });
  };

  async function chooseServiceAndDate(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: /Tratament facial/ }));
    // date picker: closed / past / fully booked days are disabled, open days are not
    const sunday = await screen.findByRole('button', { name: /duminică, 25 octombrie 2026/ });
    expect(sunday).toBeDisabled();
    expect(screen.getByRole('button', { name: /vineri, 23 octombrie 2026/ })).toBeDisabled(); // fully booked
    expect(screen.getByRole('button', { name: /marți, 20 octombrie 2026/ })).toBeDisabled(); // past
    const thursday = screen.getByRole('button', { name: 'joi, 22 octombrie 2026' });
    expect(thursday).toBeEnabled();
    await user.click(thursday);
  }

  it('walks through service → date → time → confirmation and creates the reservation', async () => {
    vi.mocked(reservationsApi.create).mockResolvedValue(reservationFixture({ id: 42 }));
    const user = userEvent.setup({ advanceTimers: () => {} });
    setup();
    await chooseServiceAndDate(user);

    // time slots: booked and blocked ones cannot be selected
    const booked = await screen.findByRole('button', { name: '10:00 – Rezervat' });
    expect(booked).toBeDisabled();
    expect(within(booked).getByText('REZERVAT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12:00 – Indisponibil' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '15:00' }));

    // summary + total are computed from the selected service
    expect(screen.getByTestId('total')).toHaveTextContent('150 RON');
    expect(screen.getByText('15:00')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Observații (opțional)'), 'Ten sensibil');
    await user.click(screen.getByRole('button', { name: 'Confirmă rezervarea' }));

    await waitFor(() => expect(screen.getByText('Rezervarea a fost creată')).toBeInTheDocument());
    expect(reservationsApi.create).toHaveBeenCalledWith({ serviceId: 3, startDateTime: '2026-10-22T15:00:00', notes: 'Ten sensibil' });
  });

  it('when the slot was taken meanwhile it explains why and returns to the time step', async () => {
    vi.mocked(reservationsApi.create).mockRejectedValue(new ApiError(409, 'The selected time slot is already booked.', 'SLOT_TAKEN'));
    const user = userEvent.setup({ advanceTimers: () => {} });
    setup();
    await chooseServiceAndDate(user);
    await user.click(await screen.findByRole('button', { name: '15:00' }));
    await user.click(screen.getByRole('button', { name: 'Confirmă rezervarea' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('tocmai a fost rezervat');
    expect(await screen.findByRole('heading', { name: '3. Alege ora' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '4. Confirmă rezervarea' })).not.toBeInTheDocument();
  });

  it('shows an empty state for closed days', async () => {
    vi.mocked(availabilityApi.day).mockResolvedValue({ ...day22, open: false, slots: [] });
    const user = userEvent.setup({ advanceTimers: () => {} });
    setup();
    await chooseServiceAndDate(user);
    expect(await screen.findByText('Salonul este închis în această zi.')).toBeInTheDocument();
  });

  it('shows an error state with retry when availability cannot be loaded', async () => {
    vi.mocked(availabilityApi.day).mockRejectedValue(new ApiError(500, 'boom'));
    const user = userEvent.setup({ advanceTimers: () => {} });
    setup();
    await chooseServiceAndDate(user);
    expect(await screen.findByText('A apărut o problemă. Te rugăm să încerci din nou.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Încearcă din nou' })).toBeInTheDocument();
  });

  describe('without an account', () => {
    it('asks only for name, surname and phone and books as a guest', async () => {
      vi.mocked(reservationsApi.createGuest).mockResolvedValue({ id: 5, serviceName: 'Tratament facial', durationMinutes: 60, price: 150, startDateTime: '2026-10-22T15:00:00', endDateTime: '2026-10-22T16:00:00', status: 'PENDING' });
      const user = userEvent.setup({ advanceTimers: () => {} });
      setup(false);
      await chooseServiceAndDate(user);
      await user.click(await screen.findByRole('button', { name: '15:00' }));

      expect(await screen.findByTestId('guest-form')).toBeInTheDocument();
      await user.type(screen.getByLabelText('Prenume'), 'Cristina');
      await user.type(screen.getByLabelText('Nume'), 'Radu');
      await user.type(screen.getByLabelText('Număr de telefon'), '0733 444 555');
      await user.click(screen.getByLabelText(/Sunt de acord/));
      await user.click(screen.getByRole('button', { name: 'Confirmă rezervarea' }));

      await waitFor(() => expect(screen.getByText('Mulțumim pentru rezervare')).toBeInTheDocument());
      expect(reservationsApi.createGuest).toHaveBeenCalledWith({
        serviceId: 3, startDateTime: '2026-10-22T15:00:00', notes: undefined,
        firstName: 'Cristina', lastName: 'Radu', phone: '0733 444 555', acceptTerms: true,
      });
      expect(reservationsApi.create).not.toHaveBeenCalled();
    });

    it('validates the contact details before sending anything', async () => {
      const user = userEvent.setup({ advanceTimers: () => {} });
      setup(false);
      await chooseServiceAndDate(user);
      await user.click(await screen.findByRole('button', { name: '15:00' }));
      await user.type(await screen.findByLabelText('Număr de telefon'), 'abc');
      await user.click(screen.getByRole('button', { name: 'Confirmă rezervarea' }));

      expect(screen.getAllByText('Câmp obligatoriu.')).toHaveLength(2); // first name + surname
      expect(screen.getByText(/Introdu un număr de telefon valid/)).toBeInTheDocument();
      expect(screen.getByText('Trebuie să accepți termenii și politica de confidențialitate.')).toBeInTheDocument();
      expect(reservationsApi.createGuest).not.toHaveBeenCalled();
    });

    it('does not show the guest form to logged in clients', async () => {
      const user = userEvent.setup({ advanceTimers: () => {} });
      setup(true);
      await chooseServiceAndDate(user);
      await user.click(await screen.findByRole('button', { name: '15:00' }));
      expect(await screen.findByRole('button', { name: 'Confirmă rezervarea' })).toBeInTheDocument();
      expect(screen.queryByTestId('guest-form')).not.toBeInTheDocument();
    });
  });
});
