import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { statsApi } from '../../services/endpoints';
import { renderPage, settingsFixture } from '../../test/utils';
import type { Dashboard } from '../../types';
import AdminDashboard from './AdminDashboard';

vi.mock('../../services/endpoints', () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
  settingsApi: { get: vi.fn(async () => settingsFixture) },
  statsApi: { dashboard: vi.fn() },
}));

const series = (n: number) => Array.from({ length: n }, (_, i) => ({ label: String(i + 1), count: i % 4 }));

const dashboard: Dashboard = {
  today: { total: 18, scheduledClients: 15, completed: 6, cancelled: 2, noShow: 1, next: { id: 5, clientName: 'Maria Popescu', serviceName: 'Tratament facial', start: '2026-10-21T14:00:00' } },
  totalClients: 134,
  topService: 'Tratament facial',
  perDay: series(14),
  perWeek: series(8),
  perMonth: series(12),
  popularServices: [
    { name: 'Tratament facial', count: 40, revenue: 6000 },
    { name: 'Solar', count: 22, revenue: 1100 },
  ],
};

describe('Admin dashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows today figures, next reservation, totals and popular services', async () => {
    vi.mocked(statsApi.dashboard).mockResolvedValue(dashboard);
    renderPage(<AdminDashboard />, { route: '/admin', path: '/admin' });

    expect(await screen.findByText('Rezervări astăzi')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Clienți programați')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Maria Popescu')).toBeInTheDocument();
    expect(screen.getByText('134')).toBeInTheDocument();
    expect(screen.getByText('Serviciul cel mai solicitat')).toBeInTheDocument();
    expect(screen.getAllByText('Tratament facial').length).toBeGreaterThan(1); // top service + popular list
    expect(screen.getByRole('img', { name: /Rezervări pe zi/ })).toBeInTheDocument();
  });

  it('shows a loading state and then an error with retry', async () => {
    vi.mocked(statsApi.dashboard).mockRejectedValue(new Error('down'));
    renderPage(<AdminDashboard />, { route: '/admin', path: '/admin' });
    expect(screen.getByRole('status')).toHaveTextContent('Se încarcă');
    expect(await screen.findByRole('alert')).toHaveTextContent('A apărut o problemă');
    expect(screen.getByRole('button', { name: 'Încearcă din nou' })).toBeInTheDocument();
  });
});
