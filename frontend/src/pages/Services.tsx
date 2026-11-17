import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ServiceVisual } from '../components/ServiceIcon';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState, QueryState } from '../components/ui/States';
import { useSettings } from '../hooks/useSettings';
import { servicesApi } from '../services/endpoints';
import { formatMoney } from '../utils/format';

export default function Services() {
  const { settings } = useSettings();
  const services = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.list() });
  return (
    <div className="container-page py-14">
      <PageHeader eyebrow="Servicii" title="Serviciile noastre" subtitle="Alege tratamentul potrivit și programează-te online, în câțiva pași." />
      <QueryState query={services}>
        {services.data?.length === 0 ? (
          <EmptyState title="Momentan nu există servicii disponibile." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {services.data?.map((s, i) => (
              <article key={s.id} className="card flex flex-col overflow-hidden sm:flex-row">
                <ServiceVisual icon={s.icon} imageUrl={s.imageUrl} index={i} className="h-44 w-full shrink-0 sm:h-auto sm:w-44" />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <h2 className="font-display text-2xl font-semibold">{s.name}</h2>
                  <p className="flex-1 text-sm text-ink-600">{s.description}</p>
                  <p className="flex items-center gap-4 text-sm text-ink-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-gold-500" aria-hidden /> {s.durationMinutes} min
                    </span>
                    <span className="font-semibold text-ink-800">{formatMoney(s.price, settings.currency)}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink to={`/servicii/${s.id}`} variant="secondary" size="sm">
                      Vezi detalii
                    </ButtonLink>
                    <ButtonLink to={`/rezervare?serviceId=${s.id}`} size="sm">
                      Rezervă
                    </ButtonLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
