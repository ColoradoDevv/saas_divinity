import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { useAuthStore } from '@/app/store/auth';
import { LoginPage } from '../LoginPage';

vi.mock('../../hooks/useLogin', () => ({
  useLogin: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

// Mock assets
vi.mock('@/assets/images/bg.jpg', () => ({ default: 'bg.jpg' }));
vi.mock('@/assets/images/brand/imagotipo-horizontal-blanco.svg', () => ({ default: 'logo.svg' }));

import { useLogin } from '../../hooks/useLogin';
const mockUseLogin = vi.mocked(useLogin);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: false, user: null, accessToken: null, refreshToken: null, isBootstrapping: false, rememberMe: false });
});

describe('LoginPage', () => {
  it('redirects to /dashboard when already authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true });
    render(<LoginPage />, { wrapper });
    // Navigate happens — no login form rendered
    expect(screen.queryByRole('button', { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  it('renders email, password inputs and submit button', () => {
    mockUseLogin.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null } as never);
    render(<LoginPage />, { wrapper });
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('password field defaults to type=password', () => {
    mockUseLogin.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null } as never);
    render(<LoginPage />, { wrapper });
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
  });

  it('eye button toggles password visibility', async () => {
    mockUseLogin.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null } as never);
    render(<LoginPage />, { wrapper });
    const toggleBtn = screen.getByRole('button', { name: /mostrar contraseña/i });
    await userEvent.click(toggleBtn);
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'text');
  });

  it('checkbox Recordarme toggles', async () => {
    mockUseLogin.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null } as never);
    render(<LoginPage />, { wrapper });
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('shows spinner and disables button while pending', () => {
    mockUseLogin.mockReturnValue({ mutateAsync: vi.fn(), isPending: true, isError: false, error: null } as never);
    render(<LoginPage />, { wrapper });
    expect(screen.getByRole('button', { name: /iniciando/i })).toBeDisabled();
  });

  it('shows error banner on login failure', () => {
    const error = { response: { data: { detail: 'Credenciales inválidas.' } } };
    mockUseLogin.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: true, error } as never);
    render(<LoginPage />, { wrapper });
    expect(screen.getByRole('alert')).toHaveTextContent('Credenciales inválidas.');
  });

  it('shows fallback error message for non-standard errors', () => {
    mockUseLogin.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: true, error: new Error('network') } as never);
    render(<LoginPage />, { wrapper });
    expect(screen.getByRole('alert')).toHaveTextContent('Verifica tus credenciales');
  });

  it('link to /forgot-password is present', () => {
    mockUseLogin.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null } as never);
    render(<LoginPage />, { wrapper });
    expect(screen.getByRole('link', { name: /olvidaste/i })).toBeInTheDocument();
  });

  it('calls mutateAsync with form data on submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValueOnce({ is_superuser: false });
    mockUseLogin.mockReturnValue({ mutateAsync, isPending: false, isError: false, error: null } as never);
    render(<LoginPage />, { wrapper });
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'u@ex.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass1234');
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });
});
