import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import {
  md3BodyLargeClass,
  md3HeadlineSmallClass,
  md3OverlineClass,
  md3SurfaceClass,
} from '@/shared/ui/material';

import { useAuthBootstrap } from '../hooks/useAuthBootstrap';

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const user = useAuthStore((state) => state.user);

  useAuthBootstrap();

  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 py-10">
        <div className={`${md3SurfaceClass} w-full max-w-sm p-8 text-center`}>
          <span className="mx-auto inline-flex h-12 w-12 animate-spin rounded-full border-[3px] border-outline-variant border-t-error" aria-hidden="true" />
          <p className={`mt-5 ${md3OverlineClass}`}>Sistema</p>
          <h2 className={`mt-3 ${md3HeadlineSmallClass}`}>Cargando panel admin</h2>
          <p className={`mt-3 text-on-surface-variant ${md3BodyLargeClass}`}>
            Verificando permisos de administrador...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user?.is_superuser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
