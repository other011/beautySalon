import { lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { ButtonLink } from './components/ui/Button';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';
import About from './pages/About';
import Booking from './pages/Booking';
import ClientDashboard from './pages/client/ClientDashboard';
import MyReservations from './pages/client/MyReservations';
import Profile from './pages/client/Profile';
import ReservationDetail from './pages/client/ReservationDetail';
import GuestConfirmation from './pages/GuestConfirmation';
import Contact from './pages/Contact';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Legal from './pages/Legal';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ServiceDetail from './pages/ServiceDetail';
import Services from './pages/Services';

// Calendar libraries and the admin area are only downloaded when needed.
const ClientCalendar = lazy(() => import('./pages/client/ClientCalendar'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCalendar = lazy(() => import('./pages/admin/AdminCalendar'));
const AdminReservations = lazy(() => import('./pages/admin/AdminReservations'));
const AdminClients = lazy(() => import('./pages/admin/AdminClients'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminSchedule = lazy(() => import('./pages/admin/AdminSchedule'));
const AdminStats = lazy(() => import('./pages/admin/AdminStats'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'));

function NotFound() {
  return (
    <div className="container-page py-28 text-center">
      <p className="eyebrow mb-3">Eroare 404</p>
      <h1 className="font-display text-5xl font-semibold">Pagina nu a fost găsită</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-600">Linkul accesat nu există sau a fost mutat.</p>
      <ButtonLink to="/" className="mt-8">
        Înapoi acasă
      </ButtonLink>
      <p className="mt-4 text-sm">
        <Link to="/rezervare" className="text-gold-600 hover:underline">
          Sau programează o rezervare
        </Link>
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="servicii" element={<Services />} />
        <Route path="servicii/:id" element={<ServiceDetail />} />
        <Route path="despre" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<Login />} />
        <Route path="inregistrare" element={<Register />} />
        <Route path="parola-uitata" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="politica-confidentialitate" element={<Legal kind="privacy" />} />
        <Route path="termeni-conditii" element={<Legal kind="terms" />} />
        <Route path="politica-cookie" element={<Legal kind="cookies" />} />

        {/* booking is open to everybody (guests only give name, surname, phone) */}
        <Route path="rezervare" element={<Booking />} />
        <Route path="rezervare/confirmata" element={<GuestConfirmation />} />
        {/* client area */}
        <Route path="cont" element={<RequireAuth><ClientDashboard /></RequireAuth>} />
        <Route path="rezervarile-mele" element={<RequireAuth><MyReservations /></RequireAuth>} />
        <Route path="rezervari/:id" element={<RequireAuth><ReservationDetail /></RequireAuth>} />
        <Route path="rezervari/:id/modifica" element={<RequireAuth><Booking /></RequireAuth>} />
        <Route path="calendar" element={<RequireAuth><ClientCalendar /></RequireAuth>} />
        <Route path="profil" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        path="admin"
        element={
          <RequireAuth admin>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="rezervari" element={<AdminReservations />} />
        <Route path="clienti" element={<AdminClients />} />
        <Route path="servicii" element={<AdminServices />} />
        <Route path="program" element={<AdminSchedule />} />
        <Route path="statistici" element={<AdminStats />} />
        <Route path="setari" element={<AdminSettings />} />
        <Route path="audit" element={<AdminAudit />} />
      </Route>
    </Routes>
  );
}
