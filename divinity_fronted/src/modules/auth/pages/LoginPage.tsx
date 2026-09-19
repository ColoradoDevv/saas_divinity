import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import loginBackground from '@/assets/images/bg.jpg';
import imagotipoBlanco from '@/assets/images/brand/imagotipo-horizontal-blanco.svg';
import { useAuthStore } from '@/app/store/auth';
import { PasswordInput } from '@/shared/components/PasswordInput';
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
import { getApiErrorMessage } from '@/shared/utils/apiError';

import { useLogin } from '../hooks/useLogin';
import type { LoginPayload } from '../types/auth';

interface LocationState {
  from?: { pathname?: string };
}

const getErrorMessage = (error: unknown): string =>
  getApiErrorMessage(error, 'No se pudo iniciar sesión. Verifica tus credenciales e intenta de nuevo.');

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loginMutation = useLogin();

  const [formData, setFormData] = useState<LoginPayload>({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);

  const locationState = location.state as LocationState | null;
  const redirectTo = locationState?.from?.pathname || '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try {
      const loggedUser = await loginMutation.mutateAsync({ payload: formData, rememberMe });
      navigate(loggedUser?.is_superuser ? '/admin' : redirectTo, { replace: true });
    } catch {
      // El error se muestra via loginMutation.isError
    }
  };

  return (
    <div
      className="grid min-h-screen place-items-center bg-cover bg-center px-4 py-8"
      style={{
        backgroundImage: `linear-gradient(rgba(10, 18, 40, 0.55), rgba(10, 18, 40, 0.55)), url(${loginBackground})`,
      }}
    >
      <div className="flex w-full max-w-[440px] flex-col items-center gap-6">
        <img src={imagotipoBlanco} alt="Divinity" className="h-9 w-auto" />

      <section
        className={`${md3SurfaceClass} w-full bg-surface/92 px-6 py-8 backdrop-blur-md sm:px-8 sm:py-10`}
      >
        <header>
          <h1 className={`mt-3 place-self-center ${md3HeadlineSmallClass}`}>Inicia sesión</h1>
          <p className={`mt-2 text-on-surface-variant ${md3BodyLargeClass}`}>
            Ingresa tus credenciales para continuar al panel principal.
          </p>
        </header>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className={md3InputLabelClass}>
              Correo electrónico o usuario
            </label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              placeholder="nombre@empresa.com o usuario"
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
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className={md3TextFieldClass}
              required
              minLength={8}
              maxLength={128}
              aria-required="true"
              aria-invalid={loginMutation.isError}
            />
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
      </section>
      </div>
    </div>
  );
};
