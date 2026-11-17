import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api';
import { authApi } from '../services/endpoints';
import { clientFixture, renderPage, settingsFixture } from '../test/utils';
import Login from './Login';

vi.mock('../services/endpoints', () => ({
  authApi: { login: vi.fn(), me: vi.fn(), logout: vi.fn(), register: vi.fn() },
  settingsApi: { get: vi.fn(async () => settingsFixture) },
}));

const login = vi.mocked(authApi.login);

function setup() {
  return renderPage(<Login />, {
    route: '/login',
    path: '/login',
    extraRoutes: [
      { path: '/cont', element: <p>Pagina clientului</p> },
      { path: '/admin', element: <p>Pagina adminului</p> },
    ],
  });
}

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates the fields before calling the API', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByText('Câmp obligatoriu.')).toBeInTheDocument();
    expect(screen.getByText('Introdu parola.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByText('Introdu o adresă de email validă.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('logs a client in and sends them to their account', async () => {
    login.mockResolvedValue({ token: 'jwt-token', expiresAt: '2026-10-22T10:00:00Z', user: clientFixture });
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Email'), 'client@example.com');
    await user.type(screen.getByLabelText('Parolă'), 'Client123!');
    await user.click(screen.getByLabelText('Ține-mă minte'));
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(screen.getByText('Pagina clientului')).toBeInTheDocument());
    expect(login).toHaveBeenCalledWith('client@example.com', 'Client123!', true);
    expect(localStorage.getItem('salon_token')).toBe('jwt-token'); // "remember me" persists the session
  });

  it('sends administrators to the admin dashboard', async () => {
    login.mockResolvedValue({ token: 't', expiresAt: '', user: { ...clientFixture, role: 'ADMIN' } });
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Email'), 'admin@salon.ro');
    await user.type(screen.getByLabelText('Parolă'), 'Admin123!');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(screen.getByText('Pagina adminului')).toBeInTheDocument());
    expect(sessionStorage.getItem('salon_token')).toBe('t'); // no "remember me": session storage only
  });

  it('shows a clear message for wrong credentials', async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid email or password.'));
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Email'), 'client@example.com');
    await user.type(screen.getByLabelText('Parolă'), 'gresita');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email sau parolă incorectă.');
  });

  it('explains rate limiting', async () => {
    login.mockRejectedValue(new ApiError(429, 'Too many', 'TOO_MANY_REQUESTS'));
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Email'), 'client@example.com');
    await user.type(screen.getByLabelText('Parolă'), 'x');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Prea multe încercări');
  });
});
