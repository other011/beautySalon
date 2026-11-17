import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../services/endpoints';
import type { Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  salonName: 'KLD Beauty Clinic',
  tagline: 'Frumusețea ta, pe mâini de specialiști',
  logoUrl: '',
  description: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  cancellationHours: 2,
  defaultDurationMinutes: 30,
  slotStepMinutes: 30,
  bookingHorizonDays: 90,
  autoConfirm: false,
  currency: 'RON',
  timezone: 'Europe/Bucharest',
};

/** Public salon settings; falls back to defaults while loading or if the API is unreachable. */
export function useSettings() {
  const query = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 5 * 60_000 });
  return { settings: query.data ?? DEFAULT_SETTINGS, ...query };
}
