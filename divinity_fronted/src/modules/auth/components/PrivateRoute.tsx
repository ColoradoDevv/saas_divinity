import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore } from '@/app/store/org';
import {
  md3BodyLargeClass,
  md3HeadlineSmallClass,
  md3OverlineClass,
  md3SurfaceClass,
} from '@/shared/ui/material';

import { useAuthBootstrap } from '../hooks/useAuthBootstrap';

interface PrivateRouteProps {
  children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const organization = useOrgStore((state) => state.organization);
  const role = useOrgStore((state) => state.role);

  useAuthBootstrap();

  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 py-10">
        <div className={`${md3SurfaceClass} w-full max-w-sm p-8 text-center`}>
          <span className="mx-auto inline-flex h-12 w-12 animate-spin rounded-full border-[3px] border-outline-variant border-t-primary" aria-hidden="true" />
          <p className={`mt-5 ${md3OverlineClass}`}>Autenticando</p>
          <h2 className={`mt-3 ${md3HeadlineSmallClass}`}>Verificando tu sesión</h2>
          <p className={`mt-3 text-on-surface-variant ${md3BodyLargeClass}`}>
            Validando tu credencial y cargando tu perfil...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Redirigir a onboarding si la organización no completó la configuración inicial
  // (solo aplica a admins, no a superusuarios ni a la propia ruta de onboarding)
  const isOnboardingRoute = location.pathname === '/onboarding';
  const isSuperRoute = location.pathname === '/super';
  const needsOnboarding =
    organization &&
    !organization.onboarding_completed &&
    role === 'admin' &&
    !isOnboardingRoute &&
    !isSuperRoute;

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
