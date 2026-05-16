import { api, publicApi } from '@/shared/api/api';

import type { AuthSessionResponse, LoginPayload, MeResponse } from '../types/auth';

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
};
