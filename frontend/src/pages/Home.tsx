import { useQuery } from '@tanstack/react-query';
import { Award, HeartHandshake, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LocationBlock } from '../components/LocationBlock';
import { DEFAULT_LOGO } from '../components/Logo';
import { ServiceVisual } from '../components/ServiceIcon';
import { ButtonLink } from '../components/ui/Button';
import { QueryState } from '../components/ui/States';
import { useSettings } from '../hooks/useSettings';
import { servicesApi } from '../services/endpoints';
import { formatMoney } from '../utils/format';

const ABOUT_POINTS = [
  { icon: Award, title: 'Experiență', text: 'Ani de practică în îngrijirea și înfrumusețarea pielii.' },
  { icon: ShieldCheck, title: 'Profesionalism', text: 'Protocoale riguroase, igienă și produse testate dermatologic.' },
  { icon: Sparkles, title: 'Aparatură modernă', text: 'Tehnologie de ultimă generație pentru rezultate vizibile.' },
  { icon: Users, title: 'Personal calificat', text: 'Specialiști certificați, mereu la curent cu noutățile.' },
  { icon: HeartHandshake, title: 'Atenție la clienți', text: 'Fiecare tratament este adaptat nevoilor tale.' },
];

export default function Home() {
  const { settings } = useSettings();
  const services = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.list() });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sand-100 via-ivory to-nude-100">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-300/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-nude-300/30 blur-3xl" aria-hidden />
        <div className="container-page relative grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-[1.2fr_1fr]">
          <div className="animate-fade-up">
            <p className="eyebrow mb-5">Salon de înfrumusețare</p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">{settings.salonName}</h1>
            <p className="mt-6 max-w-xl text-lg text-ink-600">{settings.tagline}</p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <ButtonLink to="/rezervare" size="lg" variant="primary">
                Programează o rezervare
              </ButtonLink>
              <ButtonLink to="/servicii" size="lg" variant="secondary">
                Descoperă serviciile
              </ButtonLink>
            </div>
          </div>
          <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block" aria-hidden>
            <div className="absolute inset-0 overflow-hidden rounded-[3rem] shadow-soft">
              <img src={settings.logoUrl || DEFAULT_LOGO} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="absolute inset-4 rounded-[2.4rem] border border-white/40" />
          </div>
        </div>
      </section>

      {/* About */}
      <section className="container-page py-20" aria-labelledby="about-title">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="eyebrow mb-3">Despre salon</p>
            <h2 id="about-title" className="section-title">
              Frumusețe cu grijă, știință și eleganță
            </h2>
            <p className="mt-5 text-ink-600">{settings.description}</p>
            <Link to="/despre" className="mt-6 inline-block text-sm font-medium text-gold-600 hover:underline">
              Citește mai mult →
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {ABOUT_POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="card flex gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold">{title}</p>
                  <p className="text-sm text-ink-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Services preview */}
      <section className="bg-sand-50 py-20" aria-labelledby="services-title">
        <div className="container-page">
          <div className="mb-10 text-center">
            <p className="eyebrow mb-3">Servicii</p>
            <h2 id="services-title" className="section-title">
              Tratamente create pentru tine
            </h2>
          </div>
          <QueryState query={services}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {services.data?.map((s, i) => (
                <article key={s.id} className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-soft">
                  <ServiceVisual icon={s.icon} imageUrl={s.imageUrl} index={i} className="h-40 w-full" />
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <h3 className="font-display text-2xl font-semibold">{s.name}</h3>
                    <p className="line-clamp-3 flex-1 text-sm text-ink-600">{s.description}</p>
                    <p className="text-sm text-ink-500">
                      {s.durationMinutes} min · {formatMoney(s.price, settings.currency)}
                    </p>
                    <ButtonLink to={`/servicii/${s.id}`} variant="secondary" size="sm">
                      Vezi detalii
                    </ButtonLink>
                  </div>
                </article>
              ))}
            </div>
          </QueryState>
        </div>
      </section>

      {/* Location */}
      <section className="container-page py-20" aria-labelledby="location-title">
        <div className="mb-10">
          <p className="eyebrow mb-3">Locație</p>
          <h2 id="location-title" className="section-title">
            Te așteptăm în salon
          </h2>
        </div>
        <LocationBlock />
      </section>

      {/* CTA */}
      <section className="container-page pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl" aria-hidden />
          <h2 className="font-display text-3xl font-semibold text-white sm:text-5xl">Pregătită pentru următoarea ta programare?</h2>
          <p className="mx-auto mt-4 max-w-lg text-sand-300/80">Alege serviciul, ziua și ora potrivită în doar câteva clickuri.</p>
          <ButtonLink to="/rezervare" variant="gold" size="lg" className="mt-8">
            Programează-te acum
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
