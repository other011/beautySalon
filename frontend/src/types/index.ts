export type Role = 'CLIENT' | 'ADMIN';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
  /** Completed visits, counted by phone number. */
  visits?: number | null;
  lastVisit?: string | null;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface ServiceSection {
  title: string;
  items: string[];
}

export interface SalonServiceItem {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  benefits: string[];
  equipment: string[];
  sections: ServiceSection[];
  imageUrl: string | null;
  icon: string | null;
  displayOrder: number;
  active: boolean;
}

export interface ServiceRequest {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  benefits: string[];
  equipment: string[];
  sections: ServiceSection[];
  imageUrl?: string | null;
  icon?: string | null;
  displayOrder?: number;
  active: boolean;
}

export interface Reservation {
  id: number;
  /** null for a booking made without an account. */
  userId: number | null;
  guest: boolean;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  /** Admin only: completed visits of this phone number. */
  visitCount: number | null;
  serviceId: number;
  serviceName: string;
  durationMinutes: number;
  price: number;
  startDateTime: string;
  endDateTime: string;
  status: ReservationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  canModify: boolean;
}

export interface ReservationRequest {
  serviceId: number;
  startDateTime: string;
  notes?: string;
  userId?: number;
  status?: ReservationStatus;
}

export interface GuestReservationRequest {
  serviceId: number;
  startDateTime: string;
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
  acceptTerms: boolean;
}

export interface GuestReservationResult {
  id: number;
  serviceName: string;
  durationMinutes: number;
  price: number;
  startDateTime: string;
  endDateTime: string;
  status: ReservationStatus;
}

export interface GuestSummary {
  name: string;
  phone: string;
  visits: number;
  bookings: number;
  lastBooking: string;
  hasAccount: boolean;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export type SlotReason = 'BOOKED' | 'BLOCKED' | 'PAST' | null;

export interface Slot {
  start: string; // HH:mm:ss
  end: string;
  available: boolean;
  reason: SlotReason;
}

export interface DayAvailability {
  date: string;
  serviceId: number;
  durationMinutes: number;
  open: boolean;
  openingTime: string | null;
  closingTime: string | null;
  slots: Slot[];
}

export interface DaySummary {
  date: string;
  available: boolean;
  freeSlots: number;
}

export interface BusinessHours {
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  openingTime: string;
  closingTime: string;
  active: boolean;
}

export type BlockedType = 'BREAK' | 'VACATION' | 'DAY_OFF' | 'CLOSED' | 'MAINTENANCE' | 'OTHER';
export type Recurrence = 'NONE' | 'DAILY' | 'WEEKLY';

export interface BlockedSlot {
  id: number;
  type: BlockedType;
  startDateTime: string;
  endDateTime: string;
  reason: string | null;
  recurrence: Recurrence;
  recurrenceUntil: string | null;
}

export interface Schedule {
  hours: BusinessHours[];
  blockedSlots: BlockedSlot[];
}

export interface Settings {
  salonName: string;
  tagline: string;
  logoUrl: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  cancellationHours: number;
  defaultDurationMinutes: number;
  slotStepMinutes: number;
  bookingHorizonDays: number;
  autoConfirm: boolean;
  currency: string;
  timezone: string;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  reservationId: number | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

export interface AuditEntry {
  id: number;
  actorName: string;
  action: string;
  entityType: string | null;
  entityId: number | null;
  message: string;
  createdAt: string;
}

export interface NamedCount {
  name: string;
  count: number;
  revenue: number;
}

export interface SeriesPoint {
  label: string;
  count: number;
}

export interface Dashboard {
  today: {
    total: number;
    scheduledClients: number;
    completed: number;
    cancelled: number;
    noShow: number;
    next: { id: number; clientName: string; serviceName: string; start: string } | null;
  };
  totalClients: number;
  topService: string | null;
  perDay: SeriesPoint[];
  perWeek: SeriesPoint[];
  perMonth: SeriesPoint[];
  popularServices: NamedCount[];
}

export type Period = 'today' | 'week' | 'month' | 'year';

export interface Report {
  period: Period;
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcoming: number;
  revenue: number;
  estimatedRevenue: number;
  newClients: number;
  returningClients: number;
  popularServices: NamedCount[];
  series: SeriesPoint[];
}

export interface ReservationQuery {
  q?: string;
  serviceId?: number | '';
  status?: ReservationStatus | '';
  guest?: boolean | '';
  dateFrom?: string;
  dateTo?: string;
  sort?: 'date' | 'client' | 'service' | 'status';
  dir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}
