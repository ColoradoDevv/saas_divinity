import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore, applyMembership } from '@/app/store/org';
import { authService } from '../../services/authService';
import { useAuthBootstrap } from '../useAuthBootstrap';

vi.mock('../../services/authService', () => ({
  authService: { getCurrentUser: vi.fn() },
}));

vi.mock('@/app/store/org', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/store/org')>();
  return { ...actual, applyMembership: vi.fn() };
});

const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
const mockApplyMembership = vi.mocked(applyMembership);

const user = {
  id: 1, username: 'u', email: 'u@ex.com', first_name: '', last_name: '',
  is_active: true, is_staff: false, is_superuser: false,
};
const membership = { role: 'admin', organization: {} as never, allowed_modules: null, position: null };

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    user: null, accessToken: null, refreshToken: null,
    isAuthenticated: false, isBootstrapping: true, rememberMe: true,
  });
  useOrgStore.setState({ organization: null, role: null, allowedModules: null, position: null });
});

describe('useAuthBootstrap', () => {
  it('calls clearSession when no tokens', async () => {
    const { result } = renderHook(() => useAuthBootstrap());
    await waitFor(() => {
      expect(useAuthStore.getState().isBootstrapping).toBe(false);
    });
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('sets user and membership when tokens are valid', async () => {
    useAuthStore.setState({ accessToken: 'acc', refreshToken: 'ref' });
    mockGetCurrentUser.mockResolvedValueOnce({ user, membership });
    renderHook(() => useAuthBootstrap());
    await waitFor(() => {
      expect(useAuthStore.getState().user).toEqual(user);
    });
    expect(mockApplyMembership).toHaveBeenCalledWith(membership);
    expect(useAuthStore.getState().isBootstrapping).toBe(false);
  });

  it('calls clearSession when getCurrentUser throws', async () => {
    useAuthStore.setState({ accessToken: 'acc', refreshToken: 'ref' });
    mockGetCurrentUser.mockRejectedValueOnce(new Error('401'));
    renderHook(() => useAuthBootstrap());
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
    expect(useAuthStore.getState().user).toBeNull();
  });
});
