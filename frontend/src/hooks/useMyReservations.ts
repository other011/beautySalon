import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { reservationsApi } from '../services/endpoints';
import type { Reservation } from '../types';
import { isUpcoming } from '../utils/format';

/** All reservations of the logged in client, split into upcoming (open) ones and history. */
export function useMyReservations() {
  const query = useQuery({
    queryKey: ['reservations', 'mine'],
    queryFn: () => reservationsApi.list({ sort: 'date', dir: 'asc', size: 200 }),
  });
  const { upcoming, history } = useMemo(() => {
    const items = query.data?.items ?? [];
    const upcoming: Reservation[] = items.filter((r) => (r.status === 'PENDING' || r.status === 'CONFIRMED') && isUpcoming(r.endDateTime));
    const history: Reservation[] = items.filter((r) => !upcoming.includes(r)).reverse();
    return { upcoming, history };
  }, [query.data]);
  return { ...query, upcoming, history };
}
