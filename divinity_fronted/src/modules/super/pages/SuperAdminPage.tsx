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
  md3OutlinedButtonClass,
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
  plan: 'pro' | 'enterprise';
  is_active: boolean;
  onboarding_completed: boolean;
  enabled_modules: string[];
  admin_email: string | null;
  member_count: number;
  worker_count: number;
  payment_status: 'paid' | 'unpaid' | 'overdue';
  last_payment_date: string | null;
  next_payment_date: string | null;
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

const updatePayment = async ({
  id,
  payment_status,
  last_payment_date,
  next_payment_date,
}: {
  id: number;
  payment_status: string;
  last_payment_date?: string | null;
  next_payment_date?: string | null;
}) => {
  const res = await api.patch(`/organizations/super/${id}/payment/`, {
    payment_status,
    last_payment_date,
    next_payment_date,
  });
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

const PLAN_OPTIONS = ['pro', 'enterprise'];

const planBadge: Record<string, string> = {
  pro: 'bg-primary-container text-on-primary-container',
  enterprise: 'bg-secondary-container text-on-secondary-container',
};

const paymentBadge: Record<string, string> = {
  paid: 'bg-[#d1fae5] text-[#065f46] dark:bg-[#064e3b] dark:text-[#6ee7b7]',
  unpaid: 'bg-[#fef9c3] text-[#713f12] dark:bg-[#422006] dark:text-[#fde68a]',
  overdue: 'bg-error-container text-on-error-container',
};

const paymentLabel: Record<string, string> = {
  paid: 'Pagado',
  unpaid: 'Pendiente',
  overdue: 'Vencido',
};

// ─── Payment Modal ────────────────────────────────────────────────────────────

const PaymentModal = ({
  org,
  onClose,
}: {
  org: OrgSummary;
  onClose: () => void;
}) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    payment_status: org.payment_status,
    last_payment_date: org.last_payment_date ?? '',
    next_payment_date: org.next_payment_date ?? '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      updatePayment({
        id: org.id,
        payment_status: form.payment_status,
        last_payment_date: form.last_payment_date || null,
        next_payment_date: form.next_payment_date || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super', 'orgs'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`${md3SurfaceClass} w-full max-w-sm p-6 shadow-2xl`}>
        <h3 className={`mb-4 ${md3TitleMediumClass}`}>Estado de pago — {org.name}</h3>

        <div className="space-y-4">
          <div>
            <label className={md3InputLabelClass}>Estado</label>
            <div className="mt-1 flex gap-2">
              {(['paid', 'unpaid', 'overdue'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, payment_status: s }))}
                  className={`flex-1 rounded-full border py-2 text-xs font-semibold capitalize transition ${
                    form.payment_status === s
                      ? `${paymentBadge[s]} border-transparent`
                      : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
                  }`}>
                  {paymentLabel[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={md3InputLabelClass}>Último pago</label>
            <input
              type="date"
              className={md3TextFieldClass}
              value={form.last_payment_date}
              onChange={(e) => setForm((p) => ({ ...p, last_payment_date: e.target.value }))}
            />
          </div>

          <div>
            <label className={md3InputLabelClass}>Próximo pago</label>
            <input
              type="date"
              className={md3TextFieldClass}
              value={form.next_payment_date}
              onChange={(e) => setForm((p) => ({ ...p, next_payment_date: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={`${md3FilledButtonClass} flex-1`}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SuperAdminPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [paymentOrg, setPaymentOrg] = useState<OrgSummary | null>(null);
  const [form, setForm] = useState<CreateOrgPayload>({
    name: '',
    plan: 'pro',
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
        name: '', plan: 'pro', enabled_modules: ['clients'],
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

  const totalWorkers = orgs.reduce((sum, o) => sum + o.worker_count, 0);
  const paidCount = orgs.filter((o) => o.payment_status === 'paid').length;
  const unpaidCount = orgs.filter((o) => o.payment_status === 'unpaid').length;
  const overdueCount = orgs.filter((o) => o.payment_status === 'overdue').length;

  return (
    <div className="space-y-6">
      {paymentOrg && (
        <PaymentModal org={paymentOrg} onClose={() => setPaymentOrg(null)} />
      )}

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
            className={md3FilledButtonClass}>
            {showForm ? 'Cancelar' : '+ Nueva empresa'}
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total empresas', value: orgs.length, color: 'text-on-surface' },
            { label: 'Activas', value: orgs.filter((o) => o.is_active).length, color: 'text-on-surface' },
            { label: 'Total trabajadores', value: totalWorkers, color: 'text-on-surface' },
            { label: 'Pagadas', value: paidCount, color: 'text-[#065f46] dark:text-[#6ee7b7]' },
            { label: 'Pendientes', value: unpaidCount, color: 'text-[#713f12] dark:text-[#fde68a]' },
            { label: 'Vencidas', value: overdueCount, color: 'text-error' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${md3CardClass} px-4 py-3`}>
              <p className={`text-2xl font-semibold ${color}`}>{value}</p>
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
                        {p === 'pro' ? 'Pro' : 'Enterprise'}
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
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-semibold text-on-surface ${md3TitleMediumClass}`}>{org.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${planBadge[org.plan] ?? planBadge.pro}`}>
                      {org.plan === 'pro' ? 'Pro' : 'Enterprise'}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${paymentBadge[org.payment_status]}`}>
                      {paymentLabel[org.payment_status]}
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
                    {org.admin_email ?? 'Sin admin asignado'}
                  </p>

                  <div className={`mt-1 flex flex-wrap gap-3 text-on-surface-variant ${md3BodyMediumClass}`}>
                    <span>{org.member_count} miembro{org.member_count !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{org.worker_count} trabajador{org.worker_count !== 1 ? 'es' : ''}</span>
                    {org.next_payment_date && (
                      <>
                        <span>·</span>
                        <span>Próx. pago: {new Date(org.next_payment_date).toLocaleDateString('es')}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {org.enabled_modules.map((m) => (
                      <span key={m} className="rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-[10px] font-medium capitalize text-on-surface-variant">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPaymentOrg(org)}
                  className={`flex-shrink-0 self-start sm:self-center ${md3OutlinedButtonClass}`}>
                  Gestionar pago
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
