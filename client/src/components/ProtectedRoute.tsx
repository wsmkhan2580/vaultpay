import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import LoadingSpinner from './LoadingSpinner';

/**
 * Client-side route gating. This is a UX convenience ONLY — it hides
 * navigation the user shouldn't see and redirects them if they land on the
 * wrong URL. It provides zero real security: every API endpoint behind
 * these routes re-checks authentication and role/ownership on the server,
 * because a determined user can always bypass frontend routing.
 */
export default function ProtectedRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner full label="Loading VaultPay…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/client'} replace />;
  }
  return <Outlet />;
}
