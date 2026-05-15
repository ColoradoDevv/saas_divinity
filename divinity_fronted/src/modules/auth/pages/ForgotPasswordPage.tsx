import { useState } from 'react';
import { Link } from 'react-router-dom';

import loginBackground from '@/assets/images/bg.jpg';
import {
  md3BodyLargeClass,
  md3BodyMediumClass,
  md3ErrorBannerClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3LabelLargeClass,
  md3OutlinedButtonClass,
  md3SuccessBannerClass,
  md3SurfaceClass,
  md3TextFieldClass,
} from '@/shared/ui/material';

import { useForgotPassword } from '../hooks/useForgotPassword';

interface ErrorWithDetail {
  response?: { data?: { detail?: string } };
}

const getErrorMessage = (error: unknown): string => {
  const detail = (error as ErrorWithDetail).response?.data?.detail;
  return typeof detail === 'string'
    ? detail
    : 'Ocurrió un error. Inténtalo de nuevo en unos minutos.';
};

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const mutation = useForgotPassword();

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try {
      await mutation.mutateAsync(email);
      setSubmitted(true);
    } catch {
      // Error mostrado via mutation.isError
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
        {submitted ? (
          /* Estado de éxito */
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.18 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.1a16 16 0 0 0 5.99 5.99l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 15z" />
              </svg>
            </span>

            <div>
              <span className={`text-primary ${md3LabelLargeClass}`}>Correo enviado</span>
              <h1 className={`mt-2 ${md3HeadlineSmallClass}`}>Revisa tu bandeja</h1>
              <p className={`mt-3 text-on-surface-variant ${md3BodyLargeClass}`}>
                Si <strong className="text-on-surface">{email}</strong> tiene una cuenta activa,
                recibirás las instrucciones para restablecer tu contraseña en breve.
              </p>
            </div>

            <div className={`w-full rounded-[16px] border border-primary/15 bg-primary-container px-4 py-3 text-sm text-on-primary-container ${md3BodyMediumClass}`}>
              Revisa también tu carpeta de spam si no ves el correo.
            </div>

            <Link to="/login" className={`${md3OutlinedButtonClass} mt-2 w-full`}>
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          /* Formulario */
          <>
            <header>
              <span className={`text-primary ${md3LabelLargeClass}`}>Recuperar acceso</span>
              <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>¿Olvidaste tu contraseña?</h1>
              <p className={`mt-2 text-on-surface-variant ${md3BodyLargeClass}`}>
                Ingresa tu correo y te enviaremos las instrucciones para restablecerla.
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={md3TextFieldClass}
                  required
                  maxLength={254}
                  aria-required="true"
                />
              </div>

              {mutation.isError && (
                <div className={md3ErrorBannerClass} role="alert" aria-live="polite">
                  {getErrorMessage(mutation.error)}
                </div>
              )}

              <button
                type="submit"
                className={`${md3FilledButtonClass} w-full`}
                disabled={mutation.isPending}
                aria-busy={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"
                      aria-hidden="true"
                    />
                    Enviando instrucciones...
                  </>
                ) : (
                  'Enviar instrucciones'
                )}
              </button>

              <Link
                to="/login"
                className={`${md3OutlinedButtonClass} w-full`}
              >
                Volver al inicio de sesión
              </Link>
            </form>
          </>
        )}
      </section>
    </div>
  );
};
