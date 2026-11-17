import type {
  AuditEntry,
  AuthResponse,
  BlockedSlot,
  BusinessHours,
  DayAvailability,
  Dashboard,
  GuestReservationRequest,
  GuestReservationResult,
  GuestSummary,
  DaySummary,
  NotificationList,
  Page,
  Report,
  Reservation,
  ReservationQuery,
  ReservationRequest,
  SalonServiceItem,
  Schedule,
  ServiceRequest,
  Settings,
  User,
} from '../types';
import { download, request } from './api';

export const authApi = {
  login: (email: string, password: string, rememberMe: boolean) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password, rememberMe }, anonymous: true }),
  register: (body: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    acceptTerms: boolean;
  }) => request<AuthResponse>('/api/auth/register', { method: 'POST', body, anonymous: true }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  me: () => request<User>('/api/auth/me'),
  forgotPassword: (email: string) => request<void>('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    request<void>('/api/auth/reset-password', { method: 'POST', body: { token, password } }),
};

export const servicesApi = {
  list: (all = false) => request<SalonServiceItem[]>('/api/services', { query: { all: all || undefined } }),
  get: (id: number) => request<SalonServiceItem>(`/api/services/${id}`),
  create: (body: ServiceRequest) => request<SalonServiceItem>('/api/services', { method: 'POST', body }),
  update: (id: number, body: ServiceRequest) => request<SalonServiceItem>(`/api/services/${id}`, { method: 'PUT', body }),
  setActive: (id: number, active: boolean) =>
    request<SalonServiceItem>(`/api/services/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' }),
  remove: (id: number) =>
    request<{ deleted: boolean; deactivated: boolean }>(`/api/services/${id}`, { method: 'DELETE' }),
};

export const availabilityApi = {
  day: (serviceId: number, date: string) =>
    request<DayAvailability>('/api/availability', { query: { serviceId, date } }),
  days: (serviceId: number, month: string) =>
    request<DaySummary[]>('/api/availability/days', { query: { serviceId, month } }),
};

export const reservationsApi = {
  list: (q: ReservationQuery) => request<Page<Reservation>>('/api/reservations', { query: { ...q } }),
  calendar: (from: string, to: string) => request<Reservation[]>('/api/reservations/calendar', { query: { from, to } }),
  get: (id: number) => request<Reservation>(`/api/reservations/${id}`),
  create: (body: ReservationRequest) => request<Reservation>('/api/reservations', { method: 'POST', body }),
  /** Booking without an account (public). */
  createGuest: (body: GuestReservationRequest) =>
    request<GuestReservationResult>('/api/guest/reservations', { method: 'POST', body, anonymous: true }),
  update: (id: number, body: ReservationRequest) => request<Reservation>(`/api/reservations/${id}`, { method: 'PUT', body }),
  cancel: (id: number) => request<Reservation>(`/api/reservations/${id}/cancel`, { method: 'POST' }),
  confirm: (id: number) => request<Reservation>(`/api/reservations/${id}/confirm`, { method: 'POST' }),
  complete: (id: number) => request<Reservation>(`/api/reservations/${id}/complete`, { method: 'POST' }),
  noShow: (id: number) => request<Reservation>(`/api/reservations/${id}/no-show`, { method: 'POST' }),
  remove: (id: number) => request<void>(`/api/reservations/${id}`, { method: 'DELETE' }),
};

export const usersApi = {
  list: (q: string, page: number, size = 15) => request<Page<User>>('/api/users', { query: { q, page, size } }),
  get: (id: number) => request<User>(`/api/users/${id}`),
  guests: (q: string) => request<GuestSummary[]>('/api/users/guests', { query: { q } }),
  create: (body: { firstName: string; lastName: string; email: string; phone: string }) =>
    request<User>('/api/users', { method: 'POST', body }),
  update: (id: number, body: { firstName: string; lastName: string; email: string; phone: string; active?: boolean }) =>
    request<User>(`/api/users/${id}`, { method: 'PUT', body }),
  changePassword: (id: number, currentPassword: string, newPassword: string) =>
    request<void>(`/api/users/${id}/password`, { method: 'POST', body: { currentPassword, newPassword } }),
  deactivate: (id: number) => request<void>(`/api/users/${id}/deactivate`, { method: 'POST' }),
  export: (id: number) => request<Record<string, unknown>>(`/api/users/${id}/export`),
  erase: (id: number) => request<void>(`/api/users/${id}`, { method: 'DELETE' }),
};

export const scheduleApi = {
  get: () => request<Schedule>('/api/schedule'),
  updateHours: (hours: BusinessHours[]) => request<BusinessHours[]>('/api/schedule', { method: 'PUT', body: { hours } }),
  blocked: () => request<BlockedSlot[]>('/api/schedule/blocked'),
  addBlocked: (body: Omit<BlockedSlot, 'id'>) => request<BlockedSlot>('/api/schedule/blocked', { method: 'POST', body }),
  removeBlocked: (id: number) => request<void>(`/api/schedule/blocked/${id}`, { method: 'DELETE' }),
};

export const settingsApi = {
  get: () => request<Settings>('/api/settings'),
  update: (body: Settings) => request<Settings>('/api/settings', { method: 'PUT', body }),
};

export const notificationsApi = {
  list: () => request<NotificationList>('/api/notifications'),
  read: (id: number) => request<void>(`/api/notifications/${id}/read`, { method: 'POST' }),
  readAll: () => request<void>('/api/notifications/read-all', { method: 'POST' }),
};

export const statsApi = {
  dashboard: () => request<Dashboard>('/api/stats/dashboard'),
  report: (period: string) => request<Report>('/api/stats/report', { query: { period } }),
  exportCsv: (period: string) => download('/api/stats/export', { period }, `rezervari-${period}.csv`),
  audit: (page: number) => request<Page<AuditEntry>>('/api/audit', { query: { page, size: 30 } }),
};
