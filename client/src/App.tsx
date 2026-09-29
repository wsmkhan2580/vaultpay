import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import LoadingSpinner from './components/LoadingSpinner';

import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Route-based code splitting: each page is fetched only when its route is
// first visited, instead of all of them being bundled into the initial
// download. Login and Register stay eager (imported normally above) since
// they're what everyone sees first — no point deferring the very first
// screen. AppShell wraps all of these, so the sidebar/nav stays on screen
// while a lazy chunk loads; only the content area shows the fallback below.
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminInvoices = lazy(() => import('./pages/admin/AdminInvoices'));
const AdminInvoiceCreate = lazy(() => import('./pages/admin/AdminInvoiceCreate'));
const AdminInvoiceDetail = lazy(() => import('./pages/admin/AdminInvoiceDetail'));
const AdminClients = lazy(() => import('./pages/admin/AdminClients'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));

const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const ClientInvoiceDetail = lazy(() => import('./pages/client/ClientInvoiceDetail'));

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/invoices', label: 'Invoices' },
  { to: '/admin/clients', label: 'Clients' },
  { to: '/admin/payments', label: 'Payments' },
];

const CLIENT_NAV = [{ to: '/client', label: 'Dashboard', end: true }];

function PageFallback() {
  // Shown only while a route's JS chunk is downloading (usually instant on
  // a warm connection). AppShell's nav stays mounted around this, so it
  // never looks like the whole app reloaded — just the content area.
  return <LoadingSpinner label="Loading page…" />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner full label="Loading VaultPay…" />;

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/client'} replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/client'} replace /> : <Register />} />

        <Route path="/" element={<Navigate to={user ? (user.role === 'ADMIN' ? '/admin' : '/client') : '/login'} replace />} />

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<AppShell navItems={ADMIN_NAV} portalLabel="Admin portal" />}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/invoices" element={<AdminInvoices />} />
            <Route path="/admin/invoices/new" element={<AdminInvoiceCreate />} />
            <Route path="/admin/invoices/:id" element={<AdminInvoiceDetail />} />
            <Route path="/admin/clients" element={<AdminClients />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
          <Route element={<AppShell navItems={CLIENT_NAV} portalLabel="Client portal" />}>
            <Route path="/client" element={<ClientDashboard />} />
            <Route path="/client/invoices/:id" element={<ClientInvoiceDetail />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
