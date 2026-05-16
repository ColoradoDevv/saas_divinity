import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/api/api';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineMediumClass,
  md3InputLabelClass,
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
  plan: 'pro' | 'enterprise';
  is_active: boolean;
  admin_email: string | null;
  payment_status: 'paid' | 'unpaid' | 'overdue';
  last_payment_date: string | null;
  next_payment_date: string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const fetchOrgs = async (): Promise<OrgSummary[]> => {
  const res = await api.get('/organizations/super/');
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

type FilterKey = 'all' | 'paid' | 'unpaid' | 'overdue';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'paid', label: 'Pagadas' },
  { key: 'unpaid', label: 'Pendientes' },
  { key: 'overdue', label: 'Vencidas' },
];

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
                  className={`flex-1 rounded-full border py-2 text-xs font-semibold transition ${
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

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminPaymentsPage = () => {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [paymentOrg, setPaymentOrg] = useState<OrgSummary | null>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['super', 'orgs'],
    queryFn: fetchOrgs,
  });

  const filtered = filter === 'all' ? orgs : orgs.filter((o) => o.payment_status === filter);

  const counts = {
    all: orgs.length,
    paid: orgs.filter((o) => o.payment_status === 'paid').length,
    unpaid: orgs.filter((o) => o.payment_status === 'unpaid').length,
    overdue: orgs.filter((o) => o.payment_status === 'overdue').length,
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      {paymentOrg && <PaymentModal org={paymentOrg} onClose={() => setPaymentOrg(null)} />}

      {/* Header */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Gestión</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Pagos</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Administra el estado de facturación de todas las empresas.
        </p>

        {/* Summary chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#d1fae5] px-3 py-1 text-[11px] font-semibold text-[#065f46] dark:bg-[#064e3b] dark:text-[#6ee7b7]">
            {counts.paid} pagadas
          </span>
          <span className="rounded-full bg-[#fef9c3] px-3 py-1 text-[11px] font-semibold text-[#713f12] dark:bg-[#422006] dark:text-[#fde68a]">
            {counts.unpaid} pendientes
          </span>
          <span className="rounded-full bg-error-container px-3 py-1 text-[11px] font-semibold text-on-error-container">
            {counts.overdue} vencidas
          </span>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
              filter === key
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
            }`}
          >
            {label}
            <span className="ml-1.5 text-[11px] opacity-70">({counts[key]})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <section className={`${md3SurfaceClass} overflow-hidden p-0`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className={`py-12 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
            No hay empresas en esta categoría.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Empresa</th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Plan</th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Estado</th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Último pago</th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Próximo pago</th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {filtered.map((org) => (
                  <tr key={org.id} className="transition hover:bg-surface-container/50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-on-surface">{org.name}</p>
                      <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{org.admin_email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-primary-container px-2.5 py-0.5 text-[11px] font-semibold capitalize text-on-primary-container">
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${paymentBadge[org.payment_status]}`}>
                        {paymentLabel[org.payment_status]}
                      </span>
                    </td>
                    <td className={`px-4 py-4 text-on-surface-variant ${md3BodyMediumClass}`}>
                      {formatDate(org.last_payment_date)}
                    </td>
                    <td className={`px-4 py-4 ${md3BodyMediumClass} ${org.payment_status === 'overdue' ? 'font-semibold text-error' : 'text-on-surface-variant'}`}>
                      {formatDate(org.next_payment_date)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setPaymentOrg(org)}
                        className={md3OutlinedButtonClass}
                      >
                        Actualizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
