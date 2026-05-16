import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import { api } from '@/shared/api/api';
import {
  md3BodyMediumClass,
  md3CardClass,
  md3ErrorBannerClass,
  md3FilledButtonClass,
  md3HeadlineMediumClass,
  md3InputLabelClass,
  md3LabelLargeClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgSummary {
  id: number;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  onboarding_completed: boolean;
  enabled_modules: string[];
  admin_email: string | null;
  member_count: number;
  created_at: string;
}

interface CreateOrgPayload {
  name: string;
  plan: string;
  enabled_modules: string[];
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const fetchOrgs = async (): Promise<OrgSummary[]> => {
  const res = await api.get('/organizations/super/');
  return res.data;
};

const createOrg = async (payload: CreateOrgPayload) => {
  const res = await api.post('/organizations/super/', payload);
  return res.data;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
  { key: 'clients', label: 'Clientes' },
  { key: 'workers', label: 'Trabajadores' },
  { key: 'payments', label: 'Pagos' },
  { key: 'attendance', label: 'Asistencia' },
  { key: 'reports', label: 'Reportes' },
];

const PLAN_OPTIONS = ['free', 'pro', 'enterprise'];

const planBadge: Record<string, string> = {
  free: 'bg-surface-container text-on-surface-variant',
  pro: 'bg-primary-container text-on-primary-container',
  enterprise: 'bg-secondary-container text-on-secondary-container',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SuperAdminPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateOrgPayload>({
    name: '',
    plan: 'free',
    enabled_modules: ['clients'],
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
  });

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['super', 'orgs'],
    queryFn: fetchOrgs,
    enabled: !!user?.is_superuser,
  });

  const mutation = useMutation({
    mutationFn: createOrg,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super', 'orgs'] });
      setShowForm(false);
      setForm({
        name: '', plan: 'free', enabled_modules: ['clients'],
        admin_email: '', admin_password: '', admin_first_name: '', admin_last_name: '',
      });
    },
  });

  if (!user?.is_superuser) return <Navigate to="/dashboard" replace />;

  const toggleModule = (key: string) => {
    setForm((prev) => ({
      ...prev,
      enabled_modules: prev.enabled_modules.includes(key)
        ? prev.enabled_modules.filter((m) => m !== key)
        : [...prev.enabled_modules, key],
    }));
  };

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className={md3OverlineClass}>Panel de control</span>
            <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Super Administrador</h1>
            <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
              Gestiona todas las empresas registradas en Divinity.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={md3FilledButtonClass}
          >
            {showForm ? 'Cancelar' : '+ Nueva empresa'}
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { label: 'Total empresas', value: orgs.length },
            { label: 'Activas', value: orgs.filter((o) => o.is_active).length },
            { label: 'Onboarding completo', value: orgs.filter((o) => o.onboarding_completed).length },
          ].map(({ label, value }) => (
            <div key={label} className={`${md3CardClass} px-4 py-3`}>
              <p className="text-2xl font-semibold text-on-surface">{value}</p>
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Crear empresa */}
      {showForm && (
        <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
          <h2 className={`mb-6 ${md3TitleMediumClass}`}>Registrar nueva empresa</h2>

          {mutation.isError && (
            <div className={`${md3ErrorBannerClass} mb-4`}>
              Error al crear la empresa. Verifica que el correo no esté en uso.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Datos de empresa */}
            <fieldset className="space-y-4">
              <legend className={`mb-3 ${md3LabelLargeClass} text-on-surface-variant`}>Empresa</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={md3InputLabelClass}>Nombre de la empresa</label>
                  <input id="name" className={md3TextFieldClass} required maxLength={120}
                    value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className={md3InputLabelClass}>Plan</label>
                  <div className="flex gap-2 mt-1">
                    {PLAN_OPTIONS.map((p) => (
                      <button key={p} type="button"
                        onClick={() => setForm((prev) => ({ ...prev, plan: p }))}
                        className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                          form.plan === p
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className={md3InputLabelClass}>Módulos habilitados</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {MODULE_OPTIONS.map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => toggleModule(key)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        form.enabled_modules.includes(key)
                          ? 'border-primary bg-primary-container text-on-primary-container'
                          : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            {/* Datos del admin */}
            <fieldset className="space-y-4">
              <legend className={`mb-3 ${md3LabelLargeClass} text-on-surface-variant`}>
                Administrador de la empresa
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="admin_first_name" className={md3InputLabelClass}>Nombre</label>
                  <input id="admin_first_name" className={md3TextFieldClass}
                    value={form.admin_first_name}
                    onChange={(e) => setForm((p) => ({ ...p, admin_first_name: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="admin_last_name" className={md3InputLabelClass}>Apellido</label>
                  <input id="admin_last_name" className={md3TextFieldClass}
                    value={form.admin_last_name}
                    onChange={(e) => setForm((p) => ({ ...p, admin_last_name: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="admin_email" className={md3InputLabelClass}>Correo electrónico</label>
                  <input id="admin_email" type="email" className={md3TextFieldClass} required
                    value={form.admin_email}
                    onChange={(e) => setForm((p) => ({ ...p, admin_email: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="admin_password" className={md3InputLabelClass}>Contraseña</label>
                  <input id="admin_password" type="password" className={md3TextFieldClass} required minLength={8}
                    value={form.admin_password}
                    onChange={(e) => setForm((p) => ({ ...p, admin_password: e.target.value }))} />
                </div>
              </div>
            </fieldset>

            <button type="submit" className={`${md3FilledButtonClass} w-full sm:w-auto`}
              disabled={mutation.isPending}>
              {mutation.isPending ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />Creando empresa...</>
              ) : 'Crear empresa'}
            </button>
          </form>
        </section>
      )}

      {/* Lista de empresas */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <h2 className={`mb-4 ${md3TitleMediumClass}`}>Empresas registradas</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : orgs.length === 0 ? (
          <p className={`py-8 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
            No hay empresas registradas aún.
          </p>
        ) : (
          <div className="space-y-3">
            {orgs.map((org) => (
              <div key={org.id}
                className="flex flex-col gap-3 rounded-[16px] border border-outline-variant/60 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-semibold text-on-surface ${md3TitleMediumClass}`}>{org.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${planBadge[org.plan] ?? planBadge.free}`}>
                      {org.plan}
                    </span>
                    {org.onboarding_completed ? (
                      <span className="rounded-full bg-primary-container/50 px-2.5 py-0.5 text-[11px] font-semibold text-on-primary-container">
                        Configurado
                      </span>
                    ) : (
                      <span className="rounded-full bg-error-container/50 px-2.5 py-0.5 text-[11px] font-semibold text-on-error-container">
                        Pendiente onboarding
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-on-surface-variant ${md3BodyMediumClass}`}>
                    {org.admin_email ?? 'Sin admin asignado'} · {org.member_count} miembro{org.member_count !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {org.enabled_modules.map((m) => (
                      <span key={m} className="rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-[10px] font-medium capitalize text-on-surface-variant">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
