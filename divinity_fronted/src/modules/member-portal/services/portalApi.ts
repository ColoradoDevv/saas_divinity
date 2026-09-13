import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Instancia separada de shared/api/api.ts (staff) — token, storage y
// refresco propios; nunca comparte sesión con el dashboard de staff.
export const portalApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

portalApi.interceptors.request.use((config) => {
  const { accessToken } = useMemberPortalAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

portalApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const { refreshToken, clearSession, setTokens } = useMemberPortalAuthStore.getState();

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || !refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Simplejwt's TokenRefreshView es genérico: solo rota el access token
      // preservando los claims custom (member_id/organization_id/kind), sin
      // conocer nada de miembros ni de staff — se puede reutilizar tal cual.
      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh: refreshToken });
      const tokens = { access: res.data.access, refresh: res.data.refresh ?? refreshToken };
      setTokens(tokens);
      originalRequest.headers.Authorization = `Bearer ${tokens.access}`;
      return portalApi(originalRequest);
    } catch (refreshError) {
      clearSession();
      if (window.location.pathname !== '/portal/login') {
        window.location.assign('/portal/login');
      }
      return Promise.reject(refreshError);
    }
  },
);
