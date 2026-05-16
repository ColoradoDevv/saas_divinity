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

/** Helper: recibe la membership del backend y actualiza el store. */
export const applyMembership = (membership: MembershipResponse | null) => {
  const { setOrganization, clearOrganization } = useOrgStore.getState();
  if (membership) {
    setOrganization(membership.organization, membership.role);
  } else {
    clearOrganization();
  }
};
