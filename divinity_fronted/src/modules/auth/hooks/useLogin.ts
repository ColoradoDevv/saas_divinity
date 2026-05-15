import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/app/store/auth';

import { authService } from '../services/authService';
import type { LoginPayload } from '../types/auth';

interface LoginArgs {
  payload: LoginPayload;
  rememberMe: boolean;
}

export const useLogin = () => {
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const setBootstrapping = useAuthStore((state) => state.setBootstrapping);
  const setRememberMe = useAuthStore((state) => state.setRememberMe);

  return useMutation({
    mutationFn: async ({ payload, rememberMe }: LoginArgs) => {
      const session = await authService.login(payload);
      // setRememberMe primero para que adaptiveStorage enrute correctamente
      setRememberMe(rememberMe);
      setSession(session.tokens);
      setUser(session.user);
      setBootstrapping(false);
      return session.user;
    },
  });
};
