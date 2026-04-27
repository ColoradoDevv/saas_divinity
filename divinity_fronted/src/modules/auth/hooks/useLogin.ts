import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/app/store/auth';

import { authService } from '../services/authService';
import type { LoginPayload } from '../types/auth';

export const useLogin = () => {
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const session = await authService.login(payload);
      setSession(session.tokens);
      const user = await authService.getCurrentUser();
      setUser(user);
      return user;
    },
  });
};
