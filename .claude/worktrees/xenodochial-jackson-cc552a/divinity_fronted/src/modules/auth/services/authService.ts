import { api, publicApi } from '@/shared/api/api';

import type {
  AuthSessionResponse,
  LoginPayload,
  MeResponse,
  OrgSummary,
  SwitchOrgResponse,
} from '../types/auth';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSessionResponse> {
    const response = await publicApi.post<AuthSessionResponse>('/auth/login', payload);
    return response.data;
  },

  async getCurrentUser(): Promise<MeResponse> {
    const response = await api.get<MeResponse>('/auth/me');
    return response.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await publicApi.post('/auth/forgot-password', { email });
  },

  async fetchOrganizations(): Promise<OrgSummary[]> {
    const response = await api.get<OrgSummary[]>('/auth/organizations');
    return response.data;
  },

  async switchOrg(organizationId: number): Promise<SwitchOrgResponse> {
    const response = await api.post<SwitchOrgResponse>('/auth/switch-org', {
      organization_id: organizationId,
    });
    return response.data;
  },
};
