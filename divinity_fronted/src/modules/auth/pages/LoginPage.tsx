import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import { useLogin } from '../hooks/useLogin';

// ─── Paleta ergonómica ────────────────────────────────────────────────────────
// Fondo principal:   #F5F4F1  (off-white cálido — no fatiga el ojo)
// Fondo secundario:  #EDECEA  (stone claro — sidebars, surfaces)
// Borde:             #D8D5CF  (warm border — contraste suave)
// Texto principal:   #3D3D3C  (charcoal — no negro puro, evita contraste extremo)
// Texto secundario:  #74716B  (stone mid — labels, metadata)
// Texto terciario:   #B0ADA7  (stone light — placeholders, hints)
// Acento:            #4B6A8A  (slate blue desaturado — CTA, focus, links)
// Superficie blanca: #FFFFFF  (inputs y tarjetas elevadas solamente)
// ─────────────────────────────────────────────────────────────────────────────

interface LocationState {
  from?: { pathname?: string };
}

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as any).response?.data?.detail === 'string'
  ) {
    return (error as any).response.data.detail;
  }
  return 'No se pudo iniciar sesión. Verifica tus credenciales e intenta de nuevo.';
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loginMutation = useLogin();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);

  const locationState = location.state as LocationState | null;
  const redirectTo = locationState?.from?.pathname || '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await loginMutation.mutateAsync(formData);
    navigate(redirectTo, { replace: true });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=DM+Mono&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .dvt-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #EDECEA;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
        }

        .dvt-card {
          display: flex;
          width: 100%;
          max-width: 880px;
          min-height: 540px;
          border-radius: 14px;
          overflow: hidden;
          border: 0.5px solid #D8D5CF;
        }

        /* ── Panel izquierdo ── */
        .dvt-left {
          width: 42%;
          background: #F5F4F1;
          border-right: 0.5px solid #D8D5CF;
          padding: 40px 36px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .dvt-brand { display: flex; align-items: center; gap: 10px; }
        .dvt-brand-mark {
          width: 28px; height: 28px;
          border-radius: 7px;
          background: #4B6A8A;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dvt-brand-name { font-size: 14px; font-weight: 500; color: #3D3D3C; letter-spacing: 0.01em; }

        .dvt-left-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 36px 0; }

        .dvt-tagline {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 26px;
          color: #3D3D3C;
          line-height: 1.38;
          margin-bottom: 28px;
        }
        .dvt-tagline-accent { color: #4B6A8A; font-style: normal; }

        .dvt-items { display: flex; flex-direction: column; }
        .dvt-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 13px 0;
          border-top: 0.5px solid #D8D5CF;
        }
        .dvt-item:last-child { border-bottom: 0.5px solid #D8D5CF; }
        .dvt-item-icon {
          width: 26px; height: 26px;
          border-radius: 6px;
          background: #EDECEA;
          border: 0.5px solid #D8D5CF;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .dvt-item-title { font-size: 12px; font-weight: 500; color: #3D3D3C; margin-bottom: 1px; }
        .dvt-item-text  { font-size: 12px; color: #74716B; line-height: 1.55; }

        .dvt-left-foot {
          font-family: 'DM Mono', monospace;
          font-size: 10px; color: #B0ADA7; letter-spacing: 0.03em;
        }

        /* ── Panel derecho ── */
        .dvt-right {
          flex: 1;
          background: #F5F4F1;
          padding: 52px 44px;
          display: flex; flex-direction: column; justify-content: center;
        }

        .dvt-sup {
          font-size: 10px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #4B6A8A; margin-bottom: 10px; display: block;
        }
        .dvt-right h2 {
          font-family: 'Instrument Serif', serif;
          font-size: 28px; color: #3D3D3C; line-height: 1.2; margin-bottom: 6px;
        }
        .dvt-right-sub { font-size: 13px; color: #74716B; margin-bottom: 30px; line-height: 1.5; }

        .dvt-field { margin-bottom: 16px; }
        .dvt-field label {
          display: block;
          font-size: 11px; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #74716B; margin-bottom: 7px;
        }
        .dvt-field input {
          width: 100%; height: 40px;
          border: 1px solid #D8D5CF; border-radius: 7px;
          background: #FFFFFF;
          padding: 0 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: #3D3D3C;
          outline: none;
          transition: border-color 0.15s;
        }
        .dvt-field input:hover  { border-color: #B0ADA7; }
        .dvt-field input:focus  { border-color: #4B6A8A; }
        .dvt-field input::placeholder { color: #C5C1BA; }

        .dvt-row {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 22px; margin-top: -4px;
        }
        .dvt-remember {
          display: flex; align-items: center; gap: 7px;
          font-size: 12px; color: #74716B; cursor: pointer; user-select: none;
        }
        .dvt-remember input[type='checkbox'] {
          width: 14px; height: 14px; accent-color: #4B6A8A; cursor: pointer;
        }
        .dvt-forgot {
          font-size: 12px; color: #4B6A8A; text-decoration: none;
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
        .dvt-forgot:hover { text-decoration: underline; }

        .dvt-error {
          border: 1px solid #E8C9C9; background: #FBF2F2;
          border-radius: 7px; padding: 10px 14px;
          font-size: 13px; color: #7A3535;
          margin-bottom: 14px; line-height: 1.5;
        }

        .dvt-btn {
          width: 100%; height: 42px;
          background: #3D3D3C; border: none; border-radius: 7px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          color: #F5F4F1; cursor: pointer; letter-spacing: 0.03em;
          transition: background 0.15s, opacity 0.15s;
        }
        .dvt-btn:hover:not(:disabled) { background: #2a2a29; }
        .dvt-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .dvt-sep { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .dvt-sep-line { flex: 1; height: 0.5px; background: #D8D5CF; }
        .dvt-sep-txt { font-size: 11px; color: #B0ADA7; font-family: 'DM Mono', monospace; }

        .dvt-sso {
          width: 100%; height: 40px;
          background: #FFFFFF; border: 1px solid #D8D5CF; border-radius: 7px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; color: #74716B;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: border-color 0.15s, color 0.15s;
        }
        .dvt-sso:hover { border-color: #B0ADA7; color: #3D3D3C; }

        .dvt-note {
          margin-top: 24px; font-size: 11px; color: #B0ADA7;
          font-family: 'DM Mono', monospace; text-align: center; letter-spacing: 0.02em;
        }

        @media (max-width: 660px) {
          .dvt-card { flex-direction: column; }
          .dvt-left {
            width: 100%; border-right: none;
            border-bottom: 0.5px solid #D8D5CF; padding: 28px 24px;
          }
          .dvt-left-body { padding: 24px 0; }
          .dvt-right { padding: 36px 24px; }
        }
      `}</style>

      <div className="dvt-root">
        <div className="dvt-card">

          {/* ── Panel derecho ── */}
          <section className="dvt-right">
            <span className="dvt-sup">Bienvenido de vuelta</span>
            <h2>Inicia sesión</h2>
            <p className="dvt-right-sub">Ingresa tus credenciales para continuar.</p>

            <form onSubmit={handleSubmit}>
              <div className="dvt-field">
                <label htmlFor="username">Correo electrónico</label>
                <input
                  id="username"
                  name="username"
                  type="email"
                  autoComplete="username"
                  placeholder="nombre@empresa.com"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, username: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="dvt-field">
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="dvt-row">
                <label className="dvt-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Recordarme
                </label>
                <button type="button" className="dvt-forgot">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {loginMutation.isError && (
                <div className="dvt-error">
                  {getErrorMessage(loginMutation.error)}
                </div>
              )}

              <button type="submit" className="dvt-btn" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>

            <div className="dvt-sep">
              <div className="dvt-sep-line" />
              <span className="dvt-sep-txt">o continúa con</span>
              <div className="dvt-sep-line" />
            </div>

            <button type="button" className="dvt-sso">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1" fill="#4285F4" />
                <rect x="9" y="1" width="6" height="6" rx="1" fill="#EA4335" />
                <rect x="1" y="9" width="6" height="6" rx="1" fill="#34A853" />
                <rect x="9" y="9" width="6" height="6" rx="1" fill="#FBBC05" />
              </svg>
              Continuar con Google
            </button>

            <p className="dvt-note">Acceso restringido · solo personal autorizado</p>
          </section>

        </div>
      </div>
    </>
  );
};