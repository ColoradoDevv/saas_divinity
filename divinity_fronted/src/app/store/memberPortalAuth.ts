import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { PortalMemberProfile, PortalTokens } from '@/modules/member-portal/types';

interface MemberPortalAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  member: PortalMemberProfile | null;
  isAuthenticated: boolean;
  setSession: (tokens: PortalTokens, member: PortalMemberProfile) => void;
  setTokens: (tokens: PortalTokens) => void;
  setMember: (member: PortalMemberProfile) => void;
  clearSession: () => void;
}

// Sesión completamente separada de useAuthStore (staff) — así nunca se
// mezclan una sesión de staff y una de miembro en el mismo navegador.
export const useMemberPortalAuthStore = create<MemberPortalAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      member: null,
      isAuthenticated: false,
      setSession: (tokens, member) =>
        set({ accessToken: tokens.access, refreshToken: tokens.refresh, member, isAuthenticated: true }),
      setTokens: (tokens) => set({ accessToken: tokens.access, refreshToken: tokens.refresh }),
      setMember: (member) => set({ member }),
      clearSession: () =>
        set({ accessToken: null, refreshToken: null, member: null, isAuthenticated: false }),
    }),
    { name: 'divinity-member-portal-auth' },
  ),
);
