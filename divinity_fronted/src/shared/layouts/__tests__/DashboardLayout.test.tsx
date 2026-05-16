import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore } from '@/app/store/org';
import { useThemeStore } from '@/app/store/theme';
import { DashboardLayout } from '../DashboardLayout';

vi.mock('@/assets/images/brand/isotipo-blanco.svg', () => ({ default: 'isotipo-blanco.svg' }));
vi.mock('@/assets/images/brand/isotipo-color.svg', () => ({ default: 'isotipo-color.svg' }));

const org = {
  id: 1, name: 'Mi Empresa', slug: 'mi-empresa', plan: 'pro',
  enabled_modules: ['workers', 'clients'],
  is_active: true, onboarding_completed: true, primary_color: '', logo_url: '',
};

function renderLayout() {
  return render(
    <MemoryRouter>
      <DashboardLayout>
        <div>page content</div>
      </DashboardLayout>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: { id: 1, username: 'admin', email: 'admin@ex.com', first_name: 'Admin', last_name: 'User', is_active: true, is_staff: true, is_superuser: false },
    accessToken: 'acc', refreshToken: 'ref', isAuthenticated: true, isBootstrapping: false, rememberMe: true,
  });
  useOrgStore.setState({ organization: org, role: 'admin', allowedModules: null, position: null });
  useThemeStore.setState({ isDark: false });
});

describe('DashboardLayout', () => {
  it('renders children in main', () => {
    renderLayout();
    expect(screen.getByRole('main')).toHaveTextContent('page content');
  });

  it('shows org name in header when org present', () => {
    renderLayout();
    expect(screen.getAllByText('Mi Empresa').length).toBeGreaterThan(0);
  });

  it('shows "Divinity Suite" fallback when no org', () => {
    useOrgStore.setState({ organization: null, role: null, allowedModules: null, position: null });
    renderLayout();
    expect(screen.getByText('Divinity Suite')).toBeInTheDocument();
  });

  it('hamburger button opens mobile sidebar', async () => {
    renderLayout();
    const hamburger = screen.getByRole('button', { name: /abrir menú/i });
    await userEvent.click(hamburger);
    expect(screen.getByRole('complementary', { name: /menú de navegación/i })).toHaveAttribute('aria-hidden', 'false');
  });

  it('dashboard nav item always rendered regardless of modules', () => {
    useOrgStore.setState({ organization: org, role: 'staff', allowedModules: ['workers'], position: null });
    renderLayout();
    expect(screen.getAllByRole('link', { name: /panel/i }).length).toBeGreaterThan(0);
  });

  it('nav items filtered to active modules for staff', () => {
    useOrgStore.setState({ organization: org, role: 'staff', allowedModules: ['workers'], position: null });
    renderLayout();
    expect(screen.getAllByRole('link', { name: /trabajadores/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /pagos/i })).not.toBeInTheDocument();
  });

  it('role badge shows "Administrador" for admin', () => {
    renderLayout();
    expect(screen.getAllByText('Administrador').length).toBeGreaterThan(0);
  });

  it('role badge shows position for staff', () => {
    useOrgStore.setState({ organization: org, role: 'staff', allowedModules: ['workers'], position: 'Barbero' });
    renderLayout();
    expect(screen.getAllByText('Barbero').length).toBeGreaterThan(0);
  });

  it('role badge shows "Staff" as fallback when no position', () => {
    useOrgStore.setState({ organization: org, role: 'staff', allowedModules: ['workers'], position: null });
    renderLayout();
    expect(screen.getAllByText('Staff').length).toBeGreaterThan(0);
  });

  it('theme toggle aria-label reflects current mode', () => {
    useThemeStore.setState({ isDark: false });
    renderLayout();
    expect(screen.getByRole('button', { name: /cambiar a modo oscuro/i })).toBeInTheDocument();
  });

  it('theme toggle label changes after click', async () => {
    renderLayout();
    const toggleBtn = screen.getByRole('button', { name: /cambiar a modo oscuro/i });
    await userEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /cambiar a modo claro/i })).toBeInTheDocument();
  });
});
