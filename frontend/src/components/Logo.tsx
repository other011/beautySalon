import { Link } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';

/** The salon logo: the uploaded one (Admin → Setări) or the bundled KLD Beauty Clinic logo. */
export const DEFAULT_LOGO = '/logo.jpg';

export function LogoMark({ className = 'h-11 w-11' }: { className?: string }) {
  const { settings } = useSettings();
  return <img src={settings.logoUrl || DEFAULT_LOGO} alt="" className={`${className} rounded-xl object-cover`} />;
}

export function Logo({ light = false }: { light?: boolean }) {
  const { settings } = useSettings();
  return (
    <Link to="/" className="flex items-center gap-3" aria-label={`${settings.salonName} – acasă`}>
      <LogoMark />
      <span className={`hidden font-display text-2xl font-semibold leading-none tracking-tight sm:inline ${light ? 'text-white' : 'text-ink-900'}`}>
        {settings.salonName}
      </span>
    </Link>
  );
}
