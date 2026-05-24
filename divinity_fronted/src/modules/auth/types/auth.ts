export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  organization_id: number | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Organization / Membership ────────────────────────────────────────────────

export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: string;
  enabled_modules: string[];
  is_active: boolean;
  onboarding_completed: boolean;
  primary_color: string;
  logo_url: string;
}

export interface MembershipResponse {
  role: string;
  organization: Organization;
  /** Para usuarios staff: módulos que pueden ver. null = sin restricción (admin/manager). */
  allowed_modules: string[] | null;
  /** Permisos granulares por módulo para staff: {"clients":["view","create"]}. null = sin restricción. */
  module_permissions: Record<string, string[]> | null;
  /** Cargo del trabajador (solo para staff). */
  position: string | null;
}

// ─── API responses ────────────────────────────────────────────────────────────

/** Respuesta del POST /api/auth/login */
export interface AuthSessionResponse {
  user: AuthUser;
  tokens: AuthTokens;
  membership: MembershipResponse | null;
}

/** Respuesta del GET /api/auth/me */
export interface MeResponse {
  user: AuthUser;
  membership: MembershipResponse | null;
}

/** Ítem de GET /api/auth/organizations/ */
export interface OrgSummary {
  id: number;
  name: string;
  slug: string;
  role: string;
}

/** Respuesta de POST /api/auth/switch-org/ */
export interface SwitchOrgResponse {
  tokens: AuthTokens;
  membership: MembershipResponse;
}
