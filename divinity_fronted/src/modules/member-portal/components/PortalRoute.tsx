import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';

export const PortalRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useMemberPortalAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/portal/login" replace />;
  return <>{children}</>;
};
