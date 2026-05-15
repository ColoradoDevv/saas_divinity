import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import loginBackground from '@/assets/images/bg.jpg';
import { useAuthStore } from '@/app/store/auth';
import {
  md3BodyLargeClass,
  md3BodyMediumClass,
  md3ErrorBannerClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3LabelLargeClass,
  md3SurfaceClass,
  md3TextButtonClass,
  md3TextFieldClass,
} from '@/shared/ui/material';

import { useLogin } from '../hooks/useLogin';
import type { LoginPayload } from '../types/auth';

interface LocationState {
  from?: { pathname?: string };
}

interface ErrorWithDetail {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

const getErrorMessage = (error: unknown): string => {
  const detail = (error as ErrorWithDetail).response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return 'No se pudo iniciar sesión. Verifica tus credenciales e intenta de nuevo.';
};

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loginMutation = useLogin();

  const [formData, setFormData] = useState<LoginPayload>({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const locationState = location.state as LocationState | null;
  const redirectTo = locationState?.from?.pathname || '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ payload: formData, rememberMe });
      navigate(redirectTo, { replace: true });
    } catch {
      // El error se muestra via loginMutation.isError
    }
  };

  return (
    <div
      className="grid min-h-screen place-items-center bg-cover bg-center px-4 py-8"
      style={{
        backgroundImage: `linear-gradient(rgba(25, 28, 32, 0.42), rgba(25, 28, 32, 0.42)), url(${loginBackground})`,
      }}
    >
      <section
        className={`${md3SurfaceClass} w-full max-w-[440px] bg-surface/92 px-6 py-8 backdrop-blur-md sm:px-8 sm:py-10`}
      >
        <header>
          <span className={`text-primary ${md3LabelLargeClass}`}>Bienvenido de vuelta</span>
          <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>Inicia sesión</h1>
          <p className={`mt-2 text-on-surface-variant ${md3BodyLargeClass}`}>
            Ingresa tus credenciales para continuar al panel principal.
          </p>
        </header>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className={md3InputLabelClass}>
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nombre@empresa.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className={md3TextFieldClass}
              required
              maxLength={254}
              aria-required="true"
              aria-invalid={loginMutation.isError}
            />
          </div>

          <div>
            <label htmlFor="password" className={md3InputLabelClass}>
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                className={md3TextFieldClass}
                style={{ paddingRight: '3rem' }}
                required
                minLength={8}
                maxLength={128}
                aria-required="true"
                aria-invalid={loginMutation.isError}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-on-surface-variant transition hover:bg-on-surface/8 hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              className={`flex cursor-pointer items-center gap-3 pl-1 text-on-surface-variant ${md3BodyMediumClass}`}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-[18px] w-[18px] cursor-pointer rounded-[2px] border-outline text-primary focus:ring-primary/20"
              />
              Recordarme
            </label>

            <Link to="/forgot-password" className={md3TextButtonClass}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {loginMutation.isError && (
            <div className={md3ErrorBannerClass} role="alert" aria-live="polite">
              {getErrorMessage(loginMutation.error)}
            </div>
          )}

          <button
            type="submit"
            className={`${md3FilledButtonClass} w-full`}
            disabled={loginMutation.isPending}
            aria-busy={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"
                  aria-hidden="true"
                />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        <p className={`mt-6 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
          Solo personal autorizado
        </p>
      </section>
    </div>
  );
};
