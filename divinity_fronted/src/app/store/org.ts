import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { MembershipResponse, Organization } from '@/modules/auth/types/auth';

interface OrgState {
  organization: Organization | null;
  role: string | null;
  /** null = sin restricción (admin/manager). Array = módulos permitidos para staff. */
  allowedModules: string[] | null;
  /** Permisos granulares por módulo para staff: {"clients":["view","create"]}. null = sin restricción. */
  modulePermissions: Record<string, string[]> | null;
  /** Cargo del trabajador (solo para staff). */
  position: string | null;
  setOrganization: (
    org: Organization,
    role: string,
    allowedModules?: string[] | null,
    position?: string | null,
    modulePermissions?: Record<string, string[]> | null,
  ) => void;
  clearOrganization: () => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      organization: null,
      role: null,
      allowedModules: null,
      modulePermissions: null,
      position: null,
      setOrganization: (organization, role, allowedModules = null, position = null, modulePermissions = null) =>
        set({ organization, role, allowedModules, position, modulePermissions }),
      clearOrganization: () => set({ organization: null, role: null, allowedModules: null, position: null, modulePermissions: null }),
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
    setOrganization(
      membership.organization,
      membership.role,
      membership.allowed_modules ?? null,
      membership.position ?? null,
      membership.module_permissions ?? null,
    );
    applyOrgColor(membership.organization.primary_color);
  } else {
    clearOrganization();
    applyOrgColor(undefined);
  }
};
