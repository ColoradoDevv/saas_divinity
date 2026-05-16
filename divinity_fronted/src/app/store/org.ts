import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { MembershipResponse, Organization } from '@/modules/auth/types/auth';

interface OrgState {
  organization: Organization | null;
  role: string | null;
  setOrganization: (org: Organization, role: string) => void;
  clearOrganization: () => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      organization: null,
      role: null,
      setOrganization: (organization, role) => set({ organization, role }),
      clearOrganization: () => set({ organization: null, role: null }),
    }),
    { name: 'divinity-org' },
  ),
);

/** Aplica el color primario de la organización como CSS variable en el documento. */
export const applyOrgColor = (primaryColor: string | undefined) => {
  if (primaryColor && /^#[0-9a-f]{6}$/i.test(primaryColor)) {
    document.documentElement.style.setProperty('--color-primary', primaryColor);
  } else {
    document.documentElement.style.removeProperty('--color-primary');
  }
};

/** Recibe la membership del backend y actualiza el store + aplica el color. */
export const applyMembership = (membership: MembershipResponse | null) => {
  const { setOrganization, clearOrganization } = useOrgStore.getState();
  if (membership) {
    setOrganization(membership.organization, membership.role);
    applyOrgColor(membership.organization.primary_color);
  } else {
    clearOrganization();
    applyOrgColor(undefined);
  }
};
