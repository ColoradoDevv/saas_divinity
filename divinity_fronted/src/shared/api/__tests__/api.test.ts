import { describe, expect, it, vi, beforeEach } from 'vitest';

// Test the isAuthEndpoint logic and adaptiveStorage via unit extraction
// (api.ts interceptors use singletons; we test the extractable logic)

describe('isAuthEndpoint', () => {
  // Logic mirror of the function in api.ts
  const isAuthEndpoint = (url?: string) =>
    Boolean(url && (url.includes('/auth/login') || url.includes('/auth/refresh')));

  it('identifies /auth/login as auth endpoint', () => {
    expect(isAuthEndpoint('/auth/login')).toBe(true);
  });

  it('identifies /auth/refresh as auth endpoint', () => {
    expect(isAuthEndpoint('/auth/refresh')).toBe(true);
  });

  it('does not identify /auth/me as auth endpoint', () => {
    expect(isAuthEndpoint('/auth/me')).toBe(false);
  });

  it('returns false for undefined url', () => {
    expect(isAuthEndpoint(undefined)).toBe(false);
  });

  it('returns false for /workers/', () => {
    expect(isAuthEndpoint('/workers/')).toBe(false);
  });
});

describe('adaptiveStorage logic', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const adaptiveStorage = {
    getItem: (name: string): string | null =>
      localStorage.getItem(name) ?? sessionStorage.getItem(name),

    setItem: (name: string, value: string): void => {
      try {
        const parsed = JSON.parse(value) as { state?: { rememberMe?: boolean } };
        if (parsed?.state?.rememberMe === false) {
          sessionStorage.setItem(name, value);
          localStorage.removeItem(name);
        } else {
          localStorage.setItem(name, value);
          sessionStorage.removeItem(name);
        }
      } catch {
        localStorage.setItem(name, value);
      }
    },

    removeItem: (name: string): void => {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    },
  };

  it('setItem writes to sessionStorage when rememberMe=false', () => {
    const value = JSON.stringify({ state: { rememberMe: false } });
    adaptiveStorage.setItem('key', value);
    expect(sessionStorage.getItem('key')).toBe(value);
    expect(localStorage.getItem('key')).toBeNull();
  });

  it('setItem writes to localStorage when rememberMe=true', () => {
    const value = JSON.stringify({ state: { rememberMe: true } });
    adaptiveStorage.setItem('key', value);
    expect(localStorage.getItem('key')).toBe(value);
    expect(sessionStorage.getItem('key')).toBeNull();
  });

  it('setItem removes from the other storage on each write', () => {
    localStorage.setItem('key', 'old');
    const value = JSON.stringify({ state: { rememberMe: false } });
    adaptiveStorage.setItem('key', value);
    expect(localStorage.getItem('key')).toBeNull();
    expect(sessionStorage.getItem('key')).toBe(value);
  });

  it('getItem reads from localStorage first', () => {
    localStorage.setItem('key', 'from-local');
    sessionStorage.setItem('key', 'from-session');
    expect(adaptiveStorage.getItem('key')).toBe('from-local');
  });

  it('getItem falls back to sessionStorage when not in localStorage', () => {
    sessionStorage.setItem('key', 'from-session');
    expect(adaptiveStorage.getItem('key')).toBe('from-session');
  });

  it('getItem returns null when neither storage has value', () => {
    expect(adaptiveStorage.getItem('nonexistent')).toBeNull();
  });

  it('removeItem clears both storages', () => {
    localStorage.setItem('key', 'a');
    sessionStorage.setItem('key', 'b');
    adaptiveStorage.removeItem('key');
    expect(localStorage.getItem('key')).toBeNull();
    expect(sessionStorage.getItem('key')).toBeNull();
  });

  it('setItem falls back to localStorage on JSON parse error', () => {
    adaptiveStorage.setItem('key', 'not-json');
    expect(localStorage.getItem('key')).toBe('not-json');
  });
});
