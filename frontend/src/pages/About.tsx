import { Award, HeartHandshake, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ButtonLink } from '../components/ui/Button';
import { useSettings } from '../hooks/useSettings';

const VALUES = [
  { icon: Award, title: 'Experiență', text: 'Echipa noastră îmbină ani de practică cu formare continuă în cele mai noi tehnici de înfrumusețare.' },
  { icon: ShieldCheck, title: 'Profesionalism', text: 'Respectăm protocoale stricte de igienă și folosim doar produse de calitate, testate dermatologic.' },
  { icon: Sparkles, title: 'Aparatură modernă', text: 'Investim constant în echipamente performante, pentru tratamente eficiente și confortabile.' },
  { icon: Users, title: 'Personal calificat', text: 'Specialiști certificați te ghidează către tratamentul potrivit pielii și obiectivelor tale.' },
  { icon: HeartHandshake, title: 'Atenție la clienți', text: 'Ne luăm timp pentru a te asculta. Fiecare ședință este personalizată, într-o atmosferă relaxantă.' },
];

export default function About() {
  const { settings } = useSettings();
  return (
    <div className="container-page py-14">
      <PageHeader eyebrow="Despre noi" title={settings.salonName} subtitle={settings.description} />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {VALUES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-6">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="font-display text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-ink-600">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center">
        <ButtonLink to="/rezervare" size="lg">
          Programează o rezervare
        </ButtonLink>
      </div>
    </div>
  );
}
