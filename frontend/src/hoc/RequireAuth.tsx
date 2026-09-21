import React from 'react';
import { Navigate } from 'react-router-dom';
import type { AccessLevel } from '@/routes';

interface RequireAuthProps {
  access: Exclude<AccessLevel, 'public'>;
  user: any;
  loading: boolean;
  children: React.ReactNode;
}

// Gate for any non-public route. `loading` covers the initial /auth/me
// fetch on page load/refresh — we hold off redirecting until we actually
// know whether the token is valid, otherwise a hard refresh on /dashboard
// would bounce straight to /login before the check even runs.
export const RequireAuth: React.FC<RequireAuthProps> = ({ access, user, loading, children }) => {
  if (loading) return null;

  const isLoggedIn = !!user;

  if (access === 'guest') {
    if (isLoggedIn) {
      return <Navigate to={user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'} replace />;
    }
    return <>{children}</>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (access === 'super-admin' && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
