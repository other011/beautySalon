import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './ui/States';

/** Guards a route. Backend authorization is authoritative; this only decides what the UI shows. */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Se verifică sesiunea…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && !isAdmin) return <Navigate to="/cont" replace />;
  return <>{children}</>;
}
