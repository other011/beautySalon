import { LayoutDashboard, LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { ButtonLink, buttonClasses } from './ui/Button';

const LINKS = [
  { to: '/', label: 'Acasă', end: true },
  { to: '/servicii', label: 'Servicii' },
  { to: '/rezervare', label: 'Rezervare' },
  { to: '/despre', label: 'Despre noi' },
  { to: '/contact', label: 'Contact' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3.5 py-2 text-sm font-medium transition ${isActive ? 'bg-sand-100 text-ink-900' : 'text-ink-600 hover:text-ink-900'}`;

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const doLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-ivory/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4 xl:h-20">
        <Logo />

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Meniu principal">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          {!user ? (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm">
                Login
              </ButtonLink>
              <ButtonLink to="/inregistrare" size="sm">
                Înregistrare
              </ButtonLink>
            </>
          ) : (
            <>
              {isAdmin && (
                <NavLink to="/admin" className={buttonClasses('gold', 'sm')}>
                  <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                </NavLink>
              )}
              <NavLink to="/cont" className={linkClass}>
                Contul meu
              </NavLink>
              <NavLink to="/rezervarile-mele" className={linkClass}>
                Rezervările mele
              </NavLink>
              <NotificationBell />
              <button onClick={doLogout} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-600 hover:bg-sand-100">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 xl:hidden">
          {user && <NotificationBell />}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Închide meniul' : 'Deschide meniul'}
            aria-expanded={open}
            className="rounded-full p-2 text-ink-800 hover:bg-sand-100"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="animate-fade-in border-t border-sand-200 bg-ivory xl:hidden" aria-label="Meniu mobil">
          <div className="container-page flex flex-col gap-1 py-4">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
            <div className="my-2 border-t border-sand-200" />
            {!user ? (
              <div className="flex gap-2">
                <ButtonLink to="/login" variant="secondary" className="flex-1">
                  Login
                </ButtonLink>
                <ButtonLink to="/inregistrare" className="flex-1">
                  Înregistrare
                </ButtonLink>
              </div>
            ) : (
              <>
                {isAdmin && (
                  <NavLink to="/admin" className={linkClass}>
                    Admin Dashboard
                  </NavLink>
                )}
                <NavLink to="/cont" className={linkClass}>
                  <span className="inline-flex items-center gap-2">
                    <UserIcon className="h-4 w-4" /> Contul meu
                  </span>
                </NavLink>
                <NavLink to="/rezervarile-mele" className={linkClass}>
                  Rezervările mele
                </NavLink>
                <button onClick={doLogout} className="rounded-full px-3.5 py-2 text-left text-sm font-medium text-ink-600 hover:bg-sand-100">
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
