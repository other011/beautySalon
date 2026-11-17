import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { Logo } from './Logo';

export function Footer() {
  const { settings } = useSettings();
  return (
    <footer className="mt-24 bg-ink-900 text-sand-200">
      <div className="container-page grid gap-10 py-14 md:grid-cols-3">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm text-sand-300/80">{settings.tagline}</p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-display text-xl text-white">Contact</p>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden /> {settings.address}, {settings.city}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gold-400" aria-hidden /> {settings.phone}
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gold-400" aria-hidden /> {settings.email}
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-display text-xl text-white">Informații</p>
          <ul className="space-y-2">
            <li><Link className="hover:text-gold-300" to="/politica-confidentialitate">Politica de confidențialitate</Link></li>
            <li><Link className="hover:text-gold-300" to="/termeni-conditii">Termeni și condiții</Link></li>
            <li><Link className="hover:text-gold-300" to="/politica-cookie">Politica de cookie-uri</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-sand-300/60">
        © {new Date().getFullYear()} {settings.salonName}. Toate drepturile rezervate.
      </div>
    </footer>
  );
}
