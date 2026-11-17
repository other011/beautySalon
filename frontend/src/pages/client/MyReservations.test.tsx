import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reservationsApi } from '../../services/endpoints';
import { renderPage, reservationFixture, settingsFixture } from '../../test/utils';
import MyReservations from './MyReservations';

vi.mock('../../services/endpoints', () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
  settingsApi: { get: vi.fn(async () => settingsFixture) },
  notificationsApi: { list: vi.fn(async () => ({ items: [], unread: 0 })) },
  reservationsApi: { list: vi.fn(), cancel: vi.fn() },
}));

const upcoming = reservationFixture({ id: 11, serviceName: 'Tratament facial', startDateTime: '2026-10-30T15:00:00', endDateTime: '2026-10-30T16:00:00' });
const tooLate = reservationFixture({ id: 12, serviceName: 'Solar', startDateTime: '2026-10-21T11:00:00', endDateTime: '2026-10-21T11:30:00', canModify: false });
const past = reservationFixture({ id: 13, serviceName: 'Depilare', startDateTime: '2026-10-01T09:00:00', endDateTime: '2026-10-01T09:30:00', status: 'COMPLETED', canModify: false });

describe('My reservations – cancellation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0, 0));
    vi.mocked(reservationsApi.list).mockResolvedValue({ items: [past, tooLate, upcoming], page: 0, size: 200, total: 3 });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const setup = () => renderPage(<MyReservations />, { route: '/rezervarile-mele', path: '/rezervarile-mele' });

  it('lists upcoming reservations with status and price, history in another tab', async () => {
    const user = userEvent.setup({ advanceTimers: () => {} });
    setup();
    const card = await screen.findByRole('article', { name: 'Rezervare Tratament facial' });
    expect(within(card).getByText('Confirmată')).toBeInTheDocument();
    expect(within(card).getByText('150 RON')).toBeInTheDocument();
    expect(screen.queryByText('Depilare')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Istoric/ }));
    expect(await screen.findByText('Depilare')).toBeInTheDocument();
  });

  it('only offers cancel / modify while the cancellation policy allows it', async () => {
    setup();
    const ok = await screen.findByRole('article', { name: 'Rezervare Tratament facial' });
    expect(within(ok).getByRole('button', { name: 'Anulează' })).toBeInTheDocument();
    expect(within(ok).getByRole('link', { name: 'Modifică' })).toBeInTheDocument();
    const late = screen.getByRole('article', { name: 'Rezervare Solar' });
    expect(within(late).queryByRole('button', { name: 'Anulează' })).not.toBeInTheDocument();
  });

  it('asks for confirmation and cancels the reservation', async () => {
    vi.mocked(reservationsApi.cancel).mockResolvedValue({ ...upcoming, status: 'CANCELLED', canModify: false });
    const user = userEvent.setup({ advanceTimers: () => {} });
    setup();
    const card = await screen.findByRole('article', { name: 'Rezervare Tratament facial' });
    await user.click(within(card).getByRole('button', { name: 'Anulează' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Ești sigur că dorești să anulezi această rezervare\?/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Da, anulează' }));

    await waitFor(() => expect(reservationsApi.cancel).toHaveBeenCalledWith(11));
    expect(await screen.findByText('Rezervarea ta a fost anulată.')).toBeInTheDocument();
  });

  it('does nothing when the user chooses "Renunță"', async () => {
    const user = userEvent.setup({ advanceTimers: () => {} });
    setup();
    const card = await screen.findByRole('article', { name: 'Rezervare Tratament facial' });
    await user.click(within(card).getByRole('button', { name: 'Anulează' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Renunță' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(reservationsApi.cancel).not.toHaveBeenCalled();
  });

  it('shows the empty state when there is nothing to show', async () => {
    vi.mocked(reservationsApi.list).mockResolvedValue({ items: [], page: 0, size: 200, total: 0 });
    setup();
    expect(await screen.findByText('Nu ai rezervări viitoare.')).toBeInTheDocument();
  });

  it('shows an error state when loading fails', async () => {
    vi.mocked(reservationsApi.list).mockRejectedValue(new Error('network'));
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('A apărut o problemă. Te rugăm să încerci din nou.');
  });
});
