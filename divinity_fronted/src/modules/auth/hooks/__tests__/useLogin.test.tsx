import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore, applyMembership } from '@/app/store/org';
import { authService } from '../../services/authService';
import { useLogin } from '../useLogin';

vi.mock('../../services/authService', () => ({
  authService: { login: vi.fn() },
}));

vi.mock('@/app/store/org', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/store/org')>();
  return { ...actual, applyMembership: vi.fn() };
});

const mockLogin = vi.mocked(authService.login);
const mockApplyMembership = vi.mocked(applyMembership);

const user = {
  id: 1, username: 'u', email: 'u@ex.com', first_name: '', last_name: '',
  is_active: true, is_staff: false, is_superuser: false,
};
const membership = { role: 'admin', organization: {} as never, allowed_modules: null, position: null };
const session = { user, tokens: { access: 'acc', refresh: 'ref' }, membership };

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isBootstrapping: true, rememberMe: true });
  useOrgStore.setState({ organization: null, role: null, allowedModules: null, position: null });
});

describe('useLogin', () => {
  it('sets session, user, membership and bootstrapping=false on success', async () => {
    mockLogin.mockResolvedValueOnce(session);
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ payload: { email: 'u@ex.com', password: 'p' }, rememberMe: true });
    });
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('acc');
    expect(state.user).toEqual(user);
    expect(state.isBootstrapping).toBe(false);
    expect(mockApplyMembership).toHaveBeenCalledWith(membership);
  });

  it('sets rememberMe=true when passed', async () => {
    mockLogin.mockResolvedValueOnce(session);
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ payload: { email: 'u@ex.com', password: 'p' }, rememberMe: true });
    });
    expect(useAuthStore.getState().rememberMe).toBe(true);
  });

  it('sets rememberMe=false when passed', async () => {
    mockLogin.mockResolvedValueOnce(session);
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ payload: { email: 'u@ex.com', password: 'p' }, rememberMe: false });
    });
    expect(useAuthStore.getState().rememberMe).toBe(false);
  });

  it('propagates error and does not update store', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Bad creds'));
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ payload: { email: 'u@ex.com', password: 'bad' }, rememberMe: false })
      ).rejects.toThrow('Bad creds');
    });
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('calls applyMembership with null when membership is null', async () => {
    mockLogin.mockResolvedValueOnce({ ...session, membership: null });
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ payload: { email: 'u@ex.com', password: 'p' }, rememberMe: true });
    });
    expect(mockApplyMembership).toHaveBeenCalledWith(null);
  });
});
