import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

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
import { usePortalAcceptInvite } from '../hooks/useMemberPortal';

export const PortalActivatePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useMemberPortalAuthStore((s) => s.isAuthenticated);
  const acceptInvite = usePortalAcceptInvite();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/portal" replace />;

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    try {
      await acceptInvite.mutateAsync({ token: token ?? '', password });
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Este link no es válido o ya expiró. Pide una nueva invitación al staff.'));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className={`${md3SurfaceClass} w-full max-w-sm p-8`}>
        <span className={md3OverlineClass}>Portal del miembro</span>
        <h1 className={`mt-2 ${md3HeadlineSmallClass}`}>Activa tu cuenta</h1>
        <p className={`mt-2 text-on-surface-variant ${md3BodyMediumClass}`}>
          Elige una contraseña para poder ingresar la próxima vez.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className={md3InputLabelClass}>Nueva contraseña</label>
            <PasswordInput
              required
              minLength={8}
              className={md3TextFieldClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className={md3InputLabelClass}>Confirmar contraseña</label>
            <PasswordInput
              required
              minLength={8}
              className={md3TextFieldClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className={md3ErrorBannerClass}>{error}</p>}

          <button type="submit" disabled={acceptInvite.isPending} className={`${md3FilledButtonClass} w-full`}>
            {acceptInvite.isPending ? 'Activando...' : 'Activar y entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
