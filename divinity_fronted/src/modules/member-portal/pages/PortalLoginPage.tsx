import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { PasswordInput } from '@/shared/components/PasswordInput';
import {
  md3BodyMediumClass,
  md3ErrorBannerClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
} from '@/shared/ui/material';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { usePortalLogin } from '../hooks/useMemberPortal';

export const PortalLoginPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useMemberPortalAuthStore((s) => s.isAuthenticated);
  const login = usePortalLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/portal" replace />;

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    try {
      await login.mutateAsync({ email, password });
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Correo o contraseña incorrectos.'));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className={`${md3SurfaceClass} w-full max-w-sm p-8`}>
        <span className={md3OverlineClass}>Portal del miembro</span>
        <h1 className={`mt-2 ${md3HeadlineSmallClass}`}>Inicia sesión</h1>
        <p className={`mt-2 text-on-surface-variant ${md3BodyMediumClass}`}>
          Ingresa con el correo y la contraseña que activaste.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className={md3InputLabelClass}>Correo electrónico</label>
            <input
              required
              type="email"
              className={md3TextFieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className={md3InputLabelClass}>Contraseña</label>
            <PasswordInput
              required
              autoComplete="current-password"
              className={md3TextFieldClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className={md3ErrorBannerClass}>{error}</p>}

          <button type="submit" disabled={login.isPending} className={`${md3FilledButtonClass} w-full`}>
            {login.isPending ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};
