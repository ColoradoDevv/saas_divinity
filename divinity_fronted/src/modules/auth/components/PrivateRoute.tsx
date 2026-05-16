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

// Módulos requeridos por ruta
const ROUTE_MODULES: Record<string, string> = {
  '/clients': 'clients',
  '/workers': 'workers',
  '/payments': 'payments',
  '/attendance': 'attendance',
  '/reports': 'reports',
};

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const user = useAuthStore((state) => state.user);
  const organization = useOrgStore((state) => state.organization);
  const role = useOrgStore((state) => state.role);
  const allowedModules = useOrgStore((state) => state.allowedModules);

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

  // Superadmin siempre va a su propio panel
  if (user?.is_superuser) {
    return <Navigate to="/admin" replace />;
  }

  // Redirigir a onboarding si la organización no completó la configuración inicial
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

  // Protección de rutas por módulo: si el usuario tiene restricción de módulos
  // (allowedModules !== null = es staff), bloquear acceso a rutas no permitidas
  if (allowedModules !== null) {
    const requiredModule = Object.entries(ROUTE_MODULES).find(([route]) =>
      location.pathname.startsWith(route)
    )?.[1];

    if (requiredModule && !allowedModules.includes(requiredModule)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
