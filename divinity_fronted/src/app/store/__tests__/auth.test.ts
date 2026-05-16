import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../auth';

const tokens = { access: 'acc', refresh: 'ref' };
const user = {
  id: 1, username: 'u', email: 'u@ex.com', first_name: 'U', last_name: 'X',
  is_active: true, is_staff: false, is_superuser: false,
};

beforeEach(() => {
  useAuthStore.setState({
    user: null, accessToken: null, refreshToken: null,
    isAuthenticated: false, isBootstrapping: true, rememberMe: true,
  });
  localStorage.clear();
  sessionStorage.clear();
});

describe('initial state', () => {
  it('has correct defaults', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isBootstrapping).toBe(true);
    expect(state.rememberMe).toBe(true);
  });
});

describe('setSession', () => {
  it('sets tokens and isAuthenticated=true', () => {
    useAuthStore.getState().setSession(tokens);
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('acc');
    expect(s.refreshToken).toBe('ref');
    expect(s.isAuthenticated).toBe(true);
  });

  it('sets user when provided', () => {
    useAuthStore.getState().setSession(tokens, user);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('user defaults to null when omitted', () => {
    useAuthStore.getState().setSession(tokens);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('setUser', () => {
  it('isAuthenticated=true when user + tokens present', () => {
    useAuthStore.setState({ accessToken: 'acc', refreshToken: 'ref' });
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('isAuthenticated=false when user is null', () => {
    useAuthStore.setState({ accessToken: 'acc', refreshToken: 'ref' });
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('isAuthenticated=false when no access token', () => {
    useAuthStore.setState({ accessToken: null, refreshToken: 'ref' });
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('clearSession', () => {
  it('resets all fields to defaults', () => {
    useAuthStore.setState({ user, accessToken: 'acc', refreshToken: 'ref', isAuthenticated: true });
    useAuthStore.getState().clearSession();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.accessToken).toBeNull();
    expect(s.refreshToken).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isBootstrapping).toBe(false);
  });
});

describe('setBootstrapping', () => {
  it('updates flag', () => {
    useAuthStore.getState().setBootstrapping(false);
    expect(useAuthStore.getState().isBootstrapping).toBe(false);
  });
});

describe('setRememberMe', () => {
  it('updates flag', () => {
    useAuthStore.getState().setRememberMe(false);
    expect(useAuthStore.getState().rememberMe).toBe(false);
  });
});
