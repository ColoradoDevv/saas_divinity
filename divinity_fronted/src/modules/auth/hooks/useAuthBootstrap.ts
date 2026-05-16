import { useEffect } from 'react';

import { useAuthStore } from '@/app/store/auth';
import { applyMembership } from '@/app/store/org';

import { authService } from '../services/authService';

export const useAuthBootstrap = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setBootstrapping = useAuthStore((state) => state.setBootstrapping);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!accessToken || !refreshToken) {
        if (isMounted) clearSession();
        return;
      }

      try {
        const { user, membership } = await authService.getCurrentUser();
        if (isMounted) {
          setUser(user);
          applyMembership(membership);
          setBootstrapping(false);
        }
      } catch {
        if (isMounted) clearSession();
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshToken, clearSession, setBootstrapping, setUser]);
};
