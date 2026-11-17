import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { notificationsApi } from '../services/endpoints';
import { formatDateTime } from '../utils/format';

/** In-app notification centre (the channel that exists today; e-mail/SMS can plug in on the backend). */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list, refetchInterval: 60_000 });
  const readAll = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const unread = data?.unread ?? 0;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificări${unread ? `, ${unread} necitite` : ''}`}
        aria-expanded={open}
        className="relative rounded-full p-2 text-ink-700 hover:bg-sand-100"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-fade-up overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
            <p className="font-display text-lg font-semibold">Notificări</p>
            {unread > 0 && (
              <button onClick={() => readAll.mutate()} className="text-xs font-medium text-gold-600 hover:underline">
                Marchează toate citite
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {(data?.items ?? []).length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-500">Nu ai notificări.</li>}
            {data?.items.map((n) => (
              <li key={n.id} className={`border-b border-sand-100 px-4 py-3 last:border-0 ${n.read ? '' : 'bg-gold-100/40'}`}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-ink-600">{n.message}</p>
                <p className="mt-1 text-xs text-ink-400">{formatDateTime(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
