import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { MembershipResponse, Organization } from '@/modules/auth/types/auth';
import { derivePrimaryFamily } from '@/shared/utils/color';
import { useThemeStore } from './theme';

interface OrgState {
  organization: Organization | null;
  role: string | null;
  /** null = sin restricción (admin/manager). Array = módulos permitidos para staff. */
  allowedModules: string[] | null;
  /** Permisos granulares por módulo para staff: {"members":["view","create"]}. null = sin restricción. */
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

const PRIMARY_FAMILY_VARS = [
  '--color-primary',
  '--color-on-primary',
  '--color-primary-container',
  '--color-on-primary-container',
] as const;

/**
 * Aplica el color elegido por la organización como CSS variables en el
 * documento — no solo el primario "plano", sino toda su familia tonal
 * (botón, texto sobre el botón, contenedor de acento pálido y su texto),
 * derivada según el modo claro/oscuro actual. Sin color propio, se
 * eliminan las variables y el documento vuelve al azul de Divinity.
 */
export const applyOrgColor = (primaryColor: string | undefined, dark: boolean = useThemeStore.getState().isDark) => {
  const root = document.documentElement.style;
  if (primaryColor && /^#[0-9a-f]{6}$/i.test(primaryColor)) {
    const family = derivePrimaryFamily(primaryColor, dark);
    root.setProperty('--color-primary', family.primary);
    root.setProperty('--color-on-primary', family.onPrimary);
    root.setProperty('--color-primary-container', family.primaryContainer);
    root.setProperty('--color-on-primary-container', family.onPrimaryContainer);
  } else {
    PRIMARY_FAMILY_VARS.forEach((prop) => root.removeProperty(prop));
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
