import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { applyMembership, useOrgStore } from '@/app/store/org';
import { api } from '@/shared/api/api';
import {
  md3BodyLargeClass,
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineMediumClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import type { Organization } from '@/modules/auth/types/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingPayload {
  name: string;
  primary_color: string;
  logo_url: string;
  enabled_modules: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
  { key: 'clients', label: 'Clientes', description: 'Gestiona tu cartera de clientes.' },
  { key: 'workers', label: 'Trabajadores', description: 'Administra tu equipo y sus tareas.' },
  { key: 'payments', label: 'Pagos', description: 'Control de facturación y cobros.' },
  { key: 'attendance', label: 'Asistencia', description: 'Registro de presencia del equipo.' },
  { key: 'reports', label: 'Reportes', description: 'Análisis y estadísticas del negocio.' },
];

const PRESET_COLORS = [
  '#1e40af', '#0e7490', '#065f46', '#7c3aed',
  '#be185d', '#b45309', '#991b1b', '#374151',
];

const TOTAL_STEPS = 4;

// ─── API ──────────────────────────────────────────────────────────────────────

const completeOnboarding = async (payload: OnboardingPayload) => {
  const res = await api.post('/organizations/me/onboarding/', payload);
  return res.data as Organization;
};

// ─── Step components ──────────────────────────────────────────────────────────

const StepIndicator = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-2">
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
      <div key={i}
        className={`h-2 rounded-full transition-all ${
          i < current ? 'bg-primary w-6' : i === current ? 'bg-primary w-8' : 'bg-outline-variant w-2'
        }`}
      />
    ))}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const organization = useOrgStore((state) => state.organization);
  const role = useOrgStore((state) => state.role);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingPayload>({
    name: organization?.name ?? '',
    primary_color: organization?.primary_color || '#1e40af',
    logo_url: organization?.logo_url ?? '',
    enabled_modules: organization?.enabled_modules ?? ['clients'],
  });

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (updatedOrg) => {
      // Actualizar el store con los nuevos datos de la organización
      applyMembership({
        role: role ?? 'admin',
        organization: updatedOrg,
      });
      navigate('/dashboard', { replace: true });
    },
  });

  const toggleModule = (key: string) => {
    setForm((prev) => ({
      ...prev,
      enabled_modules: prev.enabled_modules.includes(key)
        ? prev.enabled_modules.filter((m) => m !== key)
        : [...prev.enabled_modules, key],
    }));
  };

  const handleFinish = () => mutation.mutate(form);

  const steps = [
    {
      title: 'Bienvenido a Divinity',
      subtitle: 'Primero, confirmemos el nombre de tu empresa.',
      content: (
        <div>
          <label htmlFor="company-name" className={md3InputLabelClass}>
            Nombre de la empresa
          </label>
          <input
            id="company-name"
            className={md3TextFieldClass}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            maxLength={120}
            placeholder="Mi Empresa S.A."
          />
          <p className={`mt-2 text-on-surface-variant ${md3BodyMediumClass}`}>
            Este nombre aparecerá en el sidebar y en tus reportes.
          </p>
        </div>
      ),
    },
    {
      title: 'Color de tu marca',
      subtitle: 'Elige el color principal que identificará tu empresa en el sistema.',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((p) => ({ ...p, primary_color: color }))}
                className={`h-12 w-full rounded-xl transition hover:scale-105 ${
                  form.primary_color === color ? 'ring-2 ring-on-surface ring-offset-2' : ''
                }`}
                style={{ backgroundColor: color }}
                aria-label={color}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border border-outline-variant"
              style={{ backgroundColor: form.primary_color }} />
            <div className="flex-1">
              <label htmlFor="custom-color" className={md3InputLabelClass}>
                Color personalizado (hex)
              </label>
              <input
                id="custom-color"
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
                className="h-10 w-full cursor-pointer rounded-lg border border-outline-variant bg-surface-container-high"
              />
            </div>
          </div>

          {/* Preview live */}
          <div className="rounded-[16px] border border-outline-variant p-4">
            <p className={`${md3BodyMediumClass} text-on-surface-variant`}>Vista previa</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl" style={{ backgroundColor: form.primary_color }} />
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: form.primary_color }}>
                Botón de ejemplo
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Logo de tu empresa',
      subtitle: 'Ingresa la URL de tu logo (JPG, PNG o SVG). Puedes cambiarlo después.',
      content: (
        <div className="space-y-4">
          <div>
            <label htmlFor="logo-url" className={md3InputLabelClass}>URL del logo</label>
            <input
              id="logo-url"
              type="url"
              className={md3TextFieldClass}
              value={form.logo_url}
              onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
              placeholder="https://mi-empresa.com/logo.svg"
            />
          </div>

          {form.logo_url && (
            <div className="flex items-center gap-4 rounded-[16px] border border-outline-variant p-4">
              <img
                src={form.logo_url}
                alt="Logo"
                className="h-12 max-w-[160px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Vista previa del logo</p>
            </div>
          )}

          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
            Si no tienes uno ahora, puedes saltarte este paso. Divinity usará su isotipo por defecto.
          </p>
        </div>
      ),
    },
    {
      title: 'Módulos activos',
      subtitle: 'Selecciona los módulos que necesita tu empresa. Puedes cambiarlos después.',
      content: (
        <div className="space-y-3">
          {MODULE_OPTIONS.map(({ key, label, description }) => {
            const active = form.enabled_modules.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleModule(key)}
                className={`flex w-full items-center justify-between rounded-[16px] border p-4 text-left transition ${
                  active
                    ? 'border-primary bg-primary-container/30'
                    : 'border-outline-variant hover:bg-on-surface/4'
                }`}>
                <div>
                  <p className={`font-medium text-on-surface ${md3TitleMediumClass}`}>{label}</p>
                  <p className={`mt-0.5 text-on-surface-variant ${md3BodyMediumClass}`}>{description}</p>
                </div>
                <div className={`h-5 w-5 flex-shrink-0 rounded-full border-2 transition ${
                  active ? 'border-primary bg-primary' : 'border-outline-variant'
                }`}>
                  {active && (
                    <svg viewBox="0 0 20 20" fill="white" className="h-full w-full p-0.5">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <StepIndicator current={step} />
        <p className={`mt-4 ${md3OverlineClass}`}>Paso {step + 1} de {TOTAL_STEPS}</p>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>{currentStep.title}</h1>
        <p className={`mt-2 text-on-surface-variant ${md3BodyLargeClass}`}>{currentStep.subtitle}</p>
      </div>

      {/* Step content */}
      <div className={`${md3SurfaceClass} p-6 sm:p-8`}>
        {currentStep.content}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className={`${md3OutlinedButtonClass} disabled:opacity-40`}>
          Anterior
        </button>

        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className={md3FilledButtonClass}>
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={mutation.isPending}
            className={md3FilledButtonClass}>
            {mutation.isPending ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />Guardando...</>
            ) : 'Finalizar configuración'}
          </button>
        )}
      </div>
    </div>
  );
};
