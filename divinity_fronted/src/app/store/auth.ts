import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthTokens, AuthUser } from '@/modules/auth/types/auth';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setSession: (tokens: AuthTokens, user?: AuthUser | null) => void;
  setUser: (user: AuthUser | null) => void;
  setBootstrapping: (value: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isBootstrapping: true,
      setSession: (tokens, user = null) =>
        set({
          user,
          accessToken: tokens.access,
          refreshToken: tokens.refresh,
          isAuthenticated: true,
        }),
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: Boolean(user && state.accessToken && state.refreshToken),
        })),
      setBootstrapping: (value) => set({ isBootstrapping: value }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
        }),
    }),
    {
      name: 'divinity-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setBootstrapping(true);
      },
    },
  ),
);
