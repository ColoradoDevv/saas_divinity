import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';

import { useAuthBootstrap } from '../hooks/useAuthBootstrap';

interface PrivateRouteProps {
  children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  useAuthBootstrap();

  if (isBootstrapping) {
    return (
      <div className="app-loader">
        <div className="loader-card">
          <span className="eyebrow">Authorizing</span>
          <h2>Restoring your secure session</h2>
          <p>Validating the persisted JWT and loading the authenticated user.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
