import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings as SettingsIcon,
  Users,
  X,
} from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { NotificationBell } from '../components/NotificationBell';
import { Spinner } from '../components/ui/States';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/admin/rezervari', label: 'Rezervări', icon: ClipboardList },
  { to: '/admin/clienti', label: 'Clienți', icon: Users },
  { to: '/admin/servicii', label: 'Servicii', icon: Scissors },
  { to: '/admin/program', label: 'Program', icon: Clock },
  { to: '/admin/statistici', label: 'Statistici', icon: BarChart3 },
  { to: '/admin/setari', label: 'Setări', icon: SettingsIcon },
  { to: '/admin/audit', label: 'Jurnal acțiuni', icon: History },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const sidebar = (
    <nav aria-label="Meniu administrare" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-ink-800 text-white' : 'text-ink-600 hover:bg-sand-100'}`
          }
        >
          <Icon className="h-4 w-4" aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="sticky top-0 z-40 border-b border-sand-200 bg-ivory/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen((o) => !o)} aria-label="Meniu" aria-expanded={open} className="rounded-full p-2 hover:bg-sand-100 lg:hidden">
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Logo />
            <span className="hidden rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gold-600 sm:inline">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/" className="hidden rounded-full px-3 py-2 text-sm text-ink-600 hover:bg-sand-100 sm:block">
              Vezi site-ul
            </Link>
            <NotificationBell />
            <span className="hidden text-sm text-ink-600 md:block">{user?.firstName}</span>
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              aria-label="Logout"
              className="rounded-full p-2 text-ink-600 hover:bg-sand-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[250px_1fr]">
        <aside className="hidden border-r border-sand-200 bg-ivory p-4 lg:block">
          <div className="sticky top-20">{sidebar}</div>
        </aside>
        {open && <div className="animate-fade-in border-b border-sand-200 bg-ivory p-4 lg:hidden">{sidebar}</div>}
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
