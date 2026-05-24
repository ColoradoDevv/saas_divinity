import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

interface OrgMember {
  id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'staff';
  is_active: boolean;
  joined_at: string;
}

interface OrgWorker {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  is_active: boolean;
}

interface OrgDetail extends OrgSummary {
  primary_color: string;
  logo_url: string;
  members: OrgMember[];
  workers: OrgWorker[];
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

const fetchOrgDetail = async (id: number): Promise<OrgDetail> => {
  const res = await api.get(`/organizations/super/${id}/`);
  return res.data;
};

const createOrg = async (payload: CreateOrgPayload) => {
  const res = await api.post('/organizations/super/', payload);
  return res.data;
};

const updateOrgSettings = async ({
  id,
  ...data
}: {
  id: number;
  name?: string;
  plan?: string;
  enabled_modules?: string[];
  is_active?: boolean;
  primary_color?: string;
  logo_url?: string;
}) => {
  const res = await api.patch(`/organizations/super/${id}/`, data);
  return res.data;
};

const updateOrgMember = async ({
  orgId,
  userId,
  role,
  is_active,
}: {
  orgId: number;
  userId: number;
  role?: string;
  is_active?: boolean;
}) => {
  const res = await api.patch(`/organizations/super/${orgId}/members/${userId}/`, {
    ...(role !== undefined && { role }),
    ...(is_active !== undefined && { is_active }),
  });
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
  { key: 'clients', label: 'Miembros' },
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

const PaymentModal = ({ org, onClose }: { org: OrgSummary; onClose: () => void }) => {
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
                  }`}
                >
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
            className={`${md3FilledButtonClass} flex-1`}
          >
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

// ─── Org Manage Drawer ────────────────────────────────────────────────────────

type ManageTab = 'general' | 'members' | 'workers';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  staff: 'Staff',
};

const OrgManageDrawer = ({ orgId, onClose }: { orgId: number; onClose: () => void }) => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<ManageTab>('general');
  const [generalForm, setGeneralForm] = useState<{
    name: string;
    plan: string;
    is_active: boolean;
    primary_color: string;
    logo_url: string;
    enabled_modules: string[];
  } | null>(null);

  const { data: org, isLoading } = useQuery<OrgDetail>({
    queryKey: ['super', 'org', orgId],
    queryFn: () => fetchOrgDetail(orgId),
  });

  // Pre-populate form once data loads
  useState(() => {
    if (org && !generalForm) {
      setGeneralForm({
        name: org.name,
        plan: org.plan,
        is_active: org.is_active,
        primary_color: org.primary_color ?? '',
        logo_url: org.logo_url ?? '',
        enabled_modules: org.enabled_modules,
      });
    }
  });

  if (org && !generalForm) {
    setGeneralForm({
      name: org.name,
      plan: org.plan,
      is_active: org.is_active,
      primary_color: org.primary_color ?? '',
      logo_url: org.logo_url ?? '',
      enabled_modules: org.enabled_modules,
    });
  }

  const settingsMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateOrgSettings>[0]) => updateOrgSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super', 'orgs'] });
      qc.invalidateQueries({ queryKey: ['super', 'org', orgId] });
    },
  });

  const memberMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateOrgMember>[0]) => updateOrgMember(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super', 'org', orgId] });
      qc.invalidateQueries({ queryKey: ['super', 'orgs'] });
    },
  });

  const toggleModule = (key: string) => {
    if (!generalForm) return;
    setGeneralForm((p) => p && ({
      ...p,
      enabled_modules: p.enabled_modules.includes(key)
        ? p.enabled_modules.filter((m) => m !== key)
        : [...p.enabled_modules, key],
    }));
  };

  const handleSaveGeneral = () => {
    if (!generalForm) return;
    settingsMutation.mutate({ id: orgId, ...generalForm });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-surface shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <div>
            <p className={md3OverlineClass}>Empresa</p>
            <h2 className={md3TitleMediumClass}>{org?.name ?? '...'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-on-surface-variant transition hover:bg-on-surface/8"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-outline-variant px-6">
          {(['general', 'members', 'workers'] as ManageTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative px-4 py-3 text-sm font-medium transition ${
                tab === t
                  ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t === 'general' ? 'General' : t === 'members' ? 'Miembros' : 'Trabajadores'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !org || !generalForm ? (
            <div className="flex justify-center py-16">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            </div>
          ) : tab === 'general' ? (
            <div className="space-y-5">
              {settingsMutation.isError && (
                <div className={md3ErrorBannerClass}>Error al guardar los cambios.</div>
              )}

              {/* Nombre */}
              <div>
                <label className={md3InputLabelClass}>Nombre de la empresa</label>
                <input
                  className={md3TextFieldClass}
                  value={generalForm.name}
                  maxLength={120}
                  onChange={(e) => setGeneralForm((p) => p && ({ ...p, name: e.target.value }))}
                />
              </div>

              {/* Plan */}
              <div>
                <label className={md3InputLabelClass}>Plan</label>
                <div className="mt-1 flex gap-2">
                  {PLAN_OPTIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setGeneralForm((prev) => prev && ({ ...prev, plan: p }))}
                      className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                        generalForm.plan === p
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
                      }`}
                    >
                      {p === 'pro' ? 'Pro' : 'Enterprise'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activo */}
              <div className="flex items-center justify-between rounded-xl border border-outline-variant px-4 py-3">
                <div>
                  <p className={`${md3LabelLargeClass} text-on-surface`}>Empresa activa</p>
                  <p className={`mt-0.5 text-xs text-on-surface-variant`}>
                    Desactivar bloquea el acceso a todos los miembros
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={generalForm.is_active}
                  onClick={() => setGeneralForm((p) => p && ({ ...p, is_active: !p.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    generalForm.is_active ? 'bg-primary' : 'bg-outline-variant'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      generalForm.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Color primario */}
              <div>
                <label className={md3InputLabelClass}>Color primario</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded-lg border border-outline-variant bg-transparent p-1"
                    value={generalForm.primary_color || '#6750A4'}
                    onChange={(e) => setGeneralForm((p) => p && ({ ...p, primary_color: e.target.value }))}
                  />
                  <input
                    className={`${md3TextFieldClass} flex-1 font-mono`}
                    placeholder="#6750A4"
                    maxLength={7}
                    value={generalForm.primary_color}
                    onChange={(e) => setGeneralForm((p) => p && ({ ...p, primary_color: e.target.value }))}
                  />
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className={md3InputLabelClass}>URL del logo</label>
                <input
                  className={md3TextFieldClass}
                  placeholder="https://..."
                  value={generalForm.logo_url}
                  onChange={(e) => setGeneralForm((p) => p && ({ ...p, logo_url: e.target.value }))}
                />
                {generalForm.logo_url && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={generalForm.logo_url}
                      alt="Preview logo"
                      className="h-10 max-w-[5rem] rounded-lg border border-outline-variant object-contain p-1"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className={`text-xs text-on-surface-variant`}>Vista previa</span>
                  </div>
                )}
              </div>

              {/* Módulos */}
              <div>
                <label className={md3InputLabelClass}>Módulos habilitados</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {MODULE_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleModule(key)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        generalForm.enabled_modules.includes(key)
                          ? 'border-primary bg-primary-container text-on-primary-container'
                          : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          ) : tab === 'members' ? (
            <div className="space-y-3">
              {org.members.length === 0 ? (
                <p className={`py-8 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
                  Sin miembros registrados.
                </p>
              ) : org.members.map((m) => (
                <div
                  key={m.user_id}
                  className={`${md3CardClass} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
                >
                  <div className="min-w-0">
                    <p className={`font-medium text-on-surface ${md3LabelLargeClass}`}>
                      {m.first_name || m.last_name
                        ? `${m.first_name} ${m.last_name}`.trim()
                        : m.email}
                    </p>
                    <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{m.email}</p>
                    <p className={`text-xs text-on-surface-variant`}>
                      Desde {new Date(m.joined_at).toLocaleDateString('es')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        memberMutation.mutate({ orgId, userId: m.user_id, role: e.target.value })
                      }
                      className="rounded-full border border-outline-variant bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {Object.entries(ROLE_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        memberMutation.mutate({ orgId, userId: m.user_id, is_active: !m.is_active })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        m.is_active
                          ? 'bg-error-container text-on-error-container hover:bg-error/20'
                          : 'bg-primary-container text-on-primary-container hover:bg-primary/20'
                      }`}
                    >
                      {m.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

          ) : (
            <div className="space-y-3">
              {org.workers.length === 0 ? (
                <p className={`py-8 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
                  Sin trabajadores registrados.
                </p>
              ) : org.workers.map((w) => (
                <div
                  key={w.id}
                  className={`${md3CardClass} flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between`}
                >
                  <div className="min-w-0">
                    <p className={`font-medium text-on-surface ${md3LabelLargeClass}`}>
                      {`${w.first_name} ${w.last_name}`.trim()}
                    </p>
                    {w.position && (
                      <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{w.position}</p>
                    )}
                    {w.email && (
                      <p className={`text-xs text-on-surface-variant`}>{w.email}</p>
                    )}
                    {w.phone && (
                      <p className={`text-xs text-on-surface-variant`}>{w.phone}</p>
                    )}
                  </div>
                  <span className={`self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:self-center ${
                    w.is_active
                      ? 'bg-[#d1fae5] text-[#065f46] dark:bg-[#064e3b] dark:text-[#6ee7b7]'
                      : 'bg-error-container/50 text-on-error-container'
                  }`}>
                    {w.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — only on General tab */}
        {tab === 'general' && generalForm && (
          <div className="border-t border-outline-variant px-6 py-4">
            <button
              type="button"
              onClick={handleSaveGeneral}
              disabled={settingsMutation.isPending}
              className={`${md3FilledButtonClass} w-full`}
            >
              {settingsMutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                  Guardando...
                </>
              ) : settingsMutation.isSuccess ? (
                'Guardado ✓'
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_FORM: CreateOrgPayload = {
  name: '',
  plan: 'pro',
  enabled_modules: ['clients'],
  admin_email: '',
  admin_password: '',
  admin_first_name: '',
  admin_last_name: '',
};

export const AdminOrganizationsPage = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [paymentOrg, setPaymentOrg] = useState<OrgSummary | null>(null);
  const [manageOrgId, setManageOrgId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateOrgPayload>(DEFAULT_FORM);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['super', 'orgs'],
    queryFn: fetchOrgs,
  });

  const mutation = useMutation({
    mutationFn: createOrg,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super', 'orgs'] });
      setShowForm(false);
      setForm(DEFAULT_FORM);
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

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      {paymentOrg && <PaymentModal org={paymentOrg} onClose={() => setPaymentOrg(null)} />}
      {manageOrgId !== null && (
        <OrgManageDrawer orgId={manageOrgId} onClose={() => setManageOrgId(null)} />
      )}

      {/* Header */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className={md3OverlineClass}>Gestión</span>
            <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Empresas</h1>
            <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
              {orgs.length} empresa{orgs.length !== 1 ? 's' : ''} registrada{orgs.length !== 1 ? 's' : ''} en el sistema.
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

        {/* Summary pills */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { label: `${orgs.filter((o) => o.payment_status === 'paid').length} pagadas`, cls: 'bg-[#d1fae5] text-[#065f46] dark:bg-[#064e3b] dark:text-[#6ee7b7]' },
            { label: `${orgs.filter((o) => o.payment_status === 'unpaid').length} pendientes`, cls: 'bg-[#fef9c3] text-[#713f12] dark:bg-[#422006] dark:text-[#fde68a]' },
            { label: `${orgs.filter((o) => o.payment_status === 'overdue').length} vencidas`, cls: 'bg-error-container text-on-error-container' },
            { label: `${orgs.filter((o) => !o.onboarding_completed).length} sin configurar`, cls: 'bg-surface-container text-on-surface-variant' },
          ].map(({ label, cls }) => (
            <span key={label} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${cls}`}>
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Create form */}
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
                  <label htmlFor="org-name" className={md3InputLabelClass}>Nombre de la empresa</label>
                  <input
                    id="org-name"
                    className={md3TextFieldClass}
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={md3InputLabelClass}>Plan</label>
                  <div className="mt-1 flex gap-2">
                    {PLAN_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, plan: p }))}
                        className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                          form.plan === p
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
                        }`}
                      >
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
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleModule(key)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        form.enabled_modules.includes(key)
                          ? 'border-primary bg-primary-container text-on-primary-container'
                          : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
                      }`}
                    >
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
                  <label htmlFor="admin-first-name" className={md3InputLabelClass}>Nombre</label>
                  <input
                    id="admin-first-name"
                    className={md3TextFieldClass}
                    value={form.admin_first_name}
                    onChange={(e) => setForm((p) => ({ ...p, admin_first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="admin-last-name" className={md3InputLabelClass}>Apellido</label>
                  <input
                    id="admin-last-name"
                    className={md3TextFieldClass}
                    value={form.admin_last_name}
                    onChange={(e) => setForm((p) => ({ ...p, admin_last_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="admin-email" className={md3InputLabelClass}>Correo electrónico</label>
                  <input
                    id="admin-email"
                    type="email"
                    className={md3TextFieldClass}
                    required
                    value={form.admin_email}
                    onChange={(e) => setForm((p) => ({ ...p, admin_email: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="admin-password" className={md3InputLabelClass}>Contraseña</label>
                  <input
                    id="admin-password"
                    type="password"
                    className={md3TextFieldClass}
                    required
                    minLength={8}
                    value={form.admin_password}
                    onChange={(e) => setForm((p) => ({ ...p, admin_password: e.target.value }))}
                  />
                </div>
              </div>
            </fieldset>

            <button
              type="submit"
              className={`${md3FilledButtonClass} w-full sm:w-auto`}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                  Creando empresa...
                </>
              ) : (
                'Crear empresa'
              )}
            </button>
          </form>
        </section>
      )}

      {/* Org list */}
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
              <div
                key={org.id}
                className={`${md3CardClass} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
              >
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
                      <span
                        key={m}
                        className="rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-[10px] font-medium capitalize text-on-surface-variant"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-col gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setManageOrgId(org.id)}
                    className={`${md3FilledButtonClass}`}
                  >
                    Gestionar empresa
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOrg(org)}
                    className={`${md3OutlinedButtonClass}`}
                  >
                    Gestionar pago
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
