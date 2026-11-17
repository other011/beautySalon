import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState, QueryState } from '../../components/ui/States';
import { statsApi } from '../../services/endpoints';
import { formatAuditDate } from '../../utils/format';

export default function AdminAudit() {
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ['audit', page], queryFn: () => statsApi.audit(page), placeholderData: (p) => p });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 30));
  return (
    <div>
      <PageHeader title="Jurnal acțiuni" subtitle="Acțiunile administratorilor: rezervări, servicii, program și setări." />
      <QueryState query={query}>
        {query.data?.items.length === 0 ? (
          <EmptyState title="Nu există acțiuni înregistrate încă." />
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-sand-100 text-sm">
              {query.data?.items.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-x-3 gap-y-1 px-5 py-3">
                  <span className="whitespace-nowrap text-ink-500">{formatAuditDate(a.createdAt)}</span>
                  <span className="text-ink-400">–</span>
                  <span className="font-medium">{a.actorName}</span>
                  <span className="text-ink-400">–</span>
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-sand-200 px-5 py-3 text-sm text-ink-600">
              <span>
                Pagina {page + 1} din {pages}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Înapoi
                </Button>
                <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                  Înainte
                </Button>
              </span>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
