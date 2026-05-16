import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthTokens, AuthUser } from '@/modules/auth/types/auth';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  rememberMe: boolean;
  setSession: (tokens: AuthTokens, user?: AuthUser | null) => void;
  setUser: (user: AuthUser | null) => void;
  setBootstrapping: (value: boolean) => void;
  setRememberMe: (value: boolean) => void;
  clearSession: () => void;
}

// Lee de localStorage primero, luego de sessionStorage (cubre ambos casos).
// Escribe en localStorage si rememberMe=true, en sessionStorage si rememberMe=false.
const adaptiveStorage = {
  getItem: (name: string): string | null =>
    localStorage.getItem(name) ?? sessionStorage.getItem(name),

  setItem: (name: string, value: string): void => {
    try {
      const parsed = JSON.parse(value) as { state?: { rememberMe?: boolean } };
      if (parsed?.state?.rememberMe === false) {
        sessionStorage.setItem(name, value);
        localStorage.removeItem(name);
      } else {
        localStorage.setItem(name, value);
        sessionStorage.removeItem(name);
      }
    } catch {
      localStorage.setItem(name, value);
    }
  },

  removeItem: (name: string): void => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isBootstrapping: true,
      rememberMe: true,
      setSession: (tokens, user = null) =>
        set({
          user,
          accessToken: tokens.access,
          refreshToken: tokens.refresh,
          isAuthenticated: true,
          isBootstrapping: true,
        }),
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: Boolean(user && state.accessToken && state.refreshToken),
        })),
      setBootstrapping: (value) => set({ isBootstrapping: value }),
      setRememberMe: (value) => set({ rememberMe: value }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
          rememberMe: true,
        }),
    }),
    {
      name: 'divinity-auth',
      storage: createJSONStorage(() => adaptiveStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setBootstrapping(true);
      },
    },
  ),
);
