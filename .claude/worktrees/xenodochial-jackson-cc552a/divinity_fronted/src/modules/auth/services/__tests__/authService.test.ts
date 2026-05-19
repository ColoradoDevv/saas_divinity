import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../authService';
import { api, publicApi } from '@/shared/api/api';

vi.mock('@/shared/api/api', () => ({
  api: { get: vi.fn() },
  publicApi: { post: vi.fn() },
}));

const mockPublicPost = vi.mocked(publicApi.post);
const mockApiGet = vi.mocked(api.get);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService.login', () => {
  it('POSTs to /auth/login and returns session data', async () => {
    const session = { user: { id: 1 }, tokens: { access: 'a', refresh: 'r' }, membership: null };
    mockPublicPost.mockResolvedValueOnce({ data: session });
    const result = await authService.login({ email: 'u@ex.com', password: 'pass' });
    expect(mockPublicPost).toHaveBeenCalledWith('/auth/login', { email: 'u@ex.com', password: 'pass' });
    expect(result).toEqual(session);
  });

  it('propagates network error', async () => {
    mockPublicPost.mockRejectedValueOnce(new Error('Network Error'));
    await expect(authService.login({ email: 'u@ex.com', password: 'p' })).rejects.toThrow('Network Error');
  });

  it('propagates 401 error', async () => {
    const err = Object.assign(new Error('401'), { response: { status: 401 } });
    mockPublicPost.mockRejectedValueOnce(err);
    await expect(authService.login({ email: 'u@ex.com', password: 'p' })).rejects.toMatchObject({ message: '401' });
  });
});

describe('authService.getCurrentUser', () => {
  it('GETs /auth/me and returns MeResponse', async () => {
    const me = { user: { id: 1 }, membership: null };
    mockApiGet.mockResolvedValueOnce({ data: me });
    const result = await authService.getCurrentUser();
    expect(mockApiGet).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(me);
  });

  it('propagates 401 error', async () => {
    const err = Object.assign(new Error('Unauthorized'), { response: { status: 401 } });
    mockApiGet.mockRejectedValueOnce(err);
    await expect(authService.getCurrentUser()).rejects.toMatchObject({ message: 'Unauthorized' });
  });
});

describe('authService.forgotPassword', () => {
  it('POSTs to /auth/forgot-password with email', async () => {
    mockPublicPost.mockResolvedValueOnce({ data: {} });
    await authService.forgotPassword('test@ex.com');
    expect(mockPublicPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'test@ex.com' });
  });

  it('propagates server error', async () => {
    mockPublicPost.mockRejectedValueOnce(new Error('500'));
    await expect(authService.forgotPassword('u@ex.com')).rejects.toThrow('500');
  });
});
