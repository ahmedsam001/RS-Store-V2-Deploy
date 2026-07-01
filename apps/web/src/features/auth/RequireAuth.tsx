import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { buildLoginRedirect } from '@/shared/lib/return-to';
import { useAuth } from '@/features/auth/AuthContext';
import { RouteLoading } from '@/routes/RouteLoading';
import type { UserRole } from '@/shared/types/AuthTypes';

type RequireAuthProps = {
  roles?: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
  preserveReturnTo?: boolean;
};

export function RequireAuth({
  roles,
  children,
  fallback = null,
  preserveReturnTo = false,
}: RequireAuthProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <RouteLoading />;
  }

  if (status !== 'authenticated' || !user) {
    if (preserveReturnTo) {
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      return (
        <Navigate to={buildLoginRedirect(location)} replace state={{ returnTo, reason: 'auth' }} />
      );
    }

    return fallback;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return fallback;
  }

  return children;
}
