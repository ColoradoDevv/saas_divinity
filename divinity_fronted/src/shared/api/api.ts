import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '@/app/store/auth';
import type { AuthTokens } from '@/modules/auth/types/auth';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  access: string;
  refresh?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const baseConfig = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const publicApi = axios.create(baseConfig);
export const api = axios.create(baseConfig);

const isAuthEndpoint = (url?: string) =>
  Boolean(url && (url.includes('/auth/login') || url.includes('/auth/refresh')));

const refreshAccessToken = async (refreshToken: string): Promise<AuthTokens> => {
  const response = await publicApi.post<RefreshResponse>('/auth/refresh', {
    refresh: refreshToken,
  });

  return {
    access: response.data.access,
    refresh: response.data.refresh ?? refreshToken,
  };
};

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const { refreshToken, clearSession, setSession, user } = useAuthStore.getState();

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      !refreshToken ||
      isAuthEndpoint(originalRequest.url)
    ) {
      if (error.response?.status === 401 && isAuthEndpoint(originalRequest?.url)) {
        clearSession();
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const tokens = await refreshAccessToken(refreshToken);
      setSession(tokens, user);
      originalRequest.headers.Authorization = `Bearer ${tokens.access}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
      return Promise.reject(refreshError);
    }
  },
);
