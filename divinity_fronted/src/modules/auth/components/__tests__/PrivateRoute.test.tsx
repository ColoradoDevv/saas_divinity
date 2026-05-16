import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore } from '@/app/store/org';
import { PrivateRoute } from '../PrivateRoute';

vi.mock('../../hooks/useAuthBootstrap', () => ({ useAuthBootstrap: vi.fn() }));

const org = {
  id: 1, name: 'Org', slug: 'org', plan: 'pro', enabled_modules: ['workers'],
  is_active: true, onboarding_completed: true, primary_color: '', logo_url: '',
};

// All protected routes go through PrivateRoute so the component runs in each case.
function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/admin" element={<div>admin</div>} />
        <Route path="/onboarding" element={<PrivateRoute><div>onboarding-protected</div></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><div>dashboard-protected</div></PrivateRoute>} />
        <Route path="*" element={<PrivateRoute><div>protected content</div></PrivateRoute>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isBootstrapping: false, rememberMe: true });
  useOrgStore.setState({ organization: null, role: null, allowedModules: null, position: null });
});

describe('PrivateRoute', () => {
  it('renders loading spinner while bootstrapping', () => {
    useAuthStore.setState({ isBootstrapping: true });
    renderRoute('/dashboard');
    expect(screen.getByText('Verificando tu sesión')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, isBootstrapping: false });
    renderRoute('/dashboard');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders children when authenticated and onboarding complete', () => {
    useAuthStore.setState({ isAuthenticated: true, isBootstrapping: false });
    useOrgStore.setState({ organization: { ...org, onboarding_completed: true }, role: 'admin', allowedModules: null, position: null });
    renderRoute('/workers');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('redirects to /onboarding when admin and onboarding incomplete', () => {
    useAuthStore.setState({ isAuthenticated: true, isBootstrapping: false });
    useOrgStore.setState({ organization: { ...org, onboarding_completed: false }, role: 'admin', allowedModules: null, position: null });
    renderRoute('/dashboard');
    // PrivateRoute on /dashboard redirects to /onboarding; PrivateRoute on /onboarding renders children
    expect(screen.getByText('onboarding-protected')).toBeInTheDocument();
  });

  it('does not redirect to /onboarding when already on /onboarding', () => {
    useAuthStore.setState({ isAuthenticated: true, isBootstrapping: false });
    useOrgStore.setState({ organization: { ...org, onboarding_completed: false }, role: 'admin', allowedModules: null, position: null });
    renderRoute('/onboarding');
    expect(screen.getByText('onboarding-protected')).toBeInTheDocument();
  });

  it('does not redirect to /onboarding when on /super route', () => {
    useAuthStore.setState({ isAuthenticated: true, isBootstrapping: false });
    useOrgStore.setState({ organization: { ...org, onboarding_completed: false }, role: 'admin', allowedModules: null, position: null });
    renderRoute('/super');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('staff with allowed module can access that route', () => {
    useAuthStore.setState({ isAuthenticated: true, isBootstrapping: false });
    useOrgStore.setState({ organization: org, role: 'staff', allowedModules: ['workers'], position: null });
    renderRoute('/workers');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('staff without allowed module is redirected to /dashboard', () => {
    useAuthStore.setState({ isAuthenticated: true, isBootstrapping: false });
    useOrgStore.setState({ organization: org, role: 'staff', allowedModules: ['workers'], position: null });
    renderRoute('/payments');
    // PrivateRoute on * redirects to /dashboard; PrivateRoute on /dashboard renders children
    expect(screen.getByText('dashboard-protected')).toBeInTheDocument();
  });

  it('admin with null allowedModules can access any module route', () => {
    useAuthStore.setState({ isAuthenticated: true, isBootstrapping: false });
    useOrgStore.setState({ organization: org, role: 'admin', allowedModules: null, position: null });
    renderRoute('/payments');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('/dashboard is accessible for staff without module restrictions on that path', () => {
    useAuthStore.setState({ isAuthenticated: true, isBootstrapping: false });
    useOrgStore.setState({ organization: org, role: 'staff', allowedModules: ['workers'], position: null });
    renderRoute('/dashboard');
    // /dashboard not in ROUTE_MODULES, so no block — renders children
    expect(screen.getByText('dashboard-protected')).toBeInTheDocument();
  });
});
