import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { ToastProvider } from '../hooks/useToast';
import type { Reservation, SalonServiceItem, Settings, User } from '../types';

export const settingsFixture: Settings = {
  salonName: 'KLD Beauty Clinic',
  tagline: 'Frumusețea ta',
  logoUrl: '',
  description: 'Descriere',
  address: 'Strada Florilor 12',
  city: 'București',
  phone: '+40 721 123 456',
  email: 'contact@aurabeauty.ro',
  cancellationHours: 2,
  defaultDurationMinutes: 30,
  slotStepMinutes: 30,
  bookingHorizonDays: 90,
  autoConfirm: false,
  currency: 'RON',
  timezone: 'Europe/Bucharest',
};

export const servicesFixture: SalonServiceItem[] = [
  { id: 1, name: 'Solar', description: 'Solar vertical', durationMinutes: 30, price: 50, benefits: [], equipment: [], sections: [], imageUrl: null, icon: 'sun', displayOrder: 1, active: true },
  { id: 3, name: 'Tratament facial', description: 'Facial', durationMinutes: 60, price: 150, benefits: [], equipment: [], sections: [], imageUrl: null, icon: 'sparkles', displayOrder: 3, active: true },
];

export const clientFixture: User = {
  id: 7,
  firstName: 'Ana',
  lastName: 'Client',
  email: 'client@example.com',
  phone: '+40721000001',
  role: 'CLIENT',
  active: true,
  createdAt: '2026-01-01T10:00:00',
};

export function reservationFixture(over: Partial<Reservation> = {}): Reservation {
  return {
    id: 11,
    userId: 7,
    guest: false,
    visitCount: null,
    clientName: 'Ana Client',
    clientEmail: 'client@example.com',
    clientPhone: '+40721000001',
    serviceId: 3,
    serviceName: 'Tratament facial',
    durationMinutes: 60,
    price: 150,
    startDateTime: '2026-10-30T15:00:00',
    endDateTime: '2026-10-30T16:00:00',
    status: 'CONFIRMED',
    notes: null,
    createdAt: '2026-10-01T10:00:00',
    updatedAt: '2026-10-01T10:00:00',
    canModify: true,
    ...over,
  };
}

interface Options {
  route?: string;
  /** Extra routes rendered next to the element under test, to assert navigation. */
  extraRoutes?: { path: string; element: ReactElement }[];
  path?: string;
}

/** Renders a page with the same providers as the real app (router, query client, toasts, auth). */
export function renderPage(ui: ReactElement, { route = '/', path = '*', extraRoutes = [] }: Options = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path={path} element={ui} />
              {extraRoutes.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
