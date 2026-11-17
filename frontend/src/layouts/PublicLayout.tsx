import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CookieBanner } from '../components/CookieBanner';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { Spinner } from '../components/ui/States';

export function PublicLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Sari la conținut
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
