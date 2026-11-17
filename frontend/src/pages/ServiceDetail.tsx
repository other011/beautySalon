import { useQuery } from '@tanstack/react-query';
import { Check, Clock, Wrench } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ServiceIcon } from '../components/ServiceIcon';
import { ButtonLink } from '../components/ui/Button';
import { QueryState } from '../components/ui/States';
import { useSettings } from '../hooks/useSettings';
import { servicesApi } from '../services/endpoints';
import { formatMoney } from '../utils/format';

export default function ServiceDetail() {
  const { id } = useParams();
  const { settings } = useSettings();
  const query = useQuery({ queryKey: ['service', id], queryFn: () => servicesApi.get(Number(id)) });
  const s = query.data;
  return (
    <div className="container-page py-14">
      <Link to="/servicii" className="mb-6 inline-block text-sm text-ink-500 hover:text-gold-600">
        ← Toate serviciile
      </Link>
      <QueryState query={query}>
        {s && (
          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-100 text-gold-600">
                <ServiceIcon name={s.icon} className="h-7 w-7" />
              </span>
              <h1 className="font-display text-4xl font-semibold sm:text-5xl">{s.name}</h1>
              <p className="mt-4 text-lg text-ink-600">{s.description}</p>

              {s.benefits.length > 0 && (
                <section className="mt-10">
                  <h2 className="mb-4 font-display text-2xl font-semibold">Beneficii</h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {s.benefits.map((b) => (
                      <li key={b} className="flex gap-3 text-ink-700">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" aria-hidden /> {b}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {s.sections.map((sec) => (
                <section key={sec.title} className="mt-10">
                  <h2 className="mb-4 font-display text-2xl font-semibold">{sec.title}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {sec.items.map((it) => (
                      <li key={it} className="rounded-full border border-sand-300 bg-white px-4 py-1.5 text-sm text-ink-700">
                        {it}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {s.equipment.length > 0 && (
                <section className="mt-10">
                  <h2 className="mb-4 font-display text-2xl font-semibold">Aparatură și metode utilizate</h2>
                  <ul className="space-y-2">
                    {s.equipment.map((e) => (
                      <li key={e} className="flex gap-3 text-ink-700">
                        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-nude-500" aria-hidden /> {e}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="card space-y-5 p-6">
                <p className="font-display text-xl font-semibold">Detalii ședință</p>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="flex items-center gap-2 text-ink-500">
                      <Clock className="h-4 w-4" aria-hidden /> Durată
                    </dt>
                    <dd className="font-medium">{s.durationMinutes} minute</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Preț</dt>
                    <dd className="font-display text-2xl font-semibold text-gold-600">{formatMoney(s.price, settings.currency)}</dd>
                  </div>
                </dl>
                <ButtonLink to={`/rezervare?serviceId=${s.id}`} className="w-full" size="lg">
                  Programează-te
                </ButtonLink>
              </div>
            </aside>
          </div>
        )}
      </QueryState>
    </div>
  );
}
