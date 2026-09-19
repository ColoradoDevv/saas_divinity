import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import { useMembers } from '@/modules/members/hooks/useMembers';
import { PlaceholderPage } from '@/shared/components/PlaceholderPage';
import { ScrollableTableWrapper } from '@/shared/components/ScrollableTableWrapper';
import { useCurrencyFormatter } from '@/shared/hooks/useCurrencyFormatter';
import { useModulePermissions } from '@/shared/hooks/useModulePermission';
import { toISODate } from '@/shared/utils/date';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineMediumClass,
  md3InputLabelClass,
  md3ModalBackdropClass,
  md3ModalPanelAnimClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
} from '@/shared/ui/material';
import { RenewModal } from '../components/RenewModal';
import { PAYMENT_METHOD_LABELS, SUBSCRIPTION_STATUS_CONFIG } from '../constants';
import { useExpiringSubscriptions, usePayments } from '../hooks/useBilling';
import type { PaymentMethod } from '../types';

const WINDOW_OPTIONS = [
  { days: 7, label: '7 días' },
  { days: 15, label: '15 días' },
  { days: 30, label: '30 días' },
];

const defaultDateTo = () => toISODate(new Date());
const defaultDateFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return toISODate(d);
};

// ─── Buscar miembro para registrar un pago ───────────────────────────────────

const RegisterPaymentButton = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const { canCreate } = useModulePermissions('payments');
  const { data: memberResults } = useMembers(1, search, '');
  const results = search.trim() ? (memberResults?.results ?? []) : [];

  if (!canCreate) return null;

  return (
    <>
      <button type="button" className={md3FilledButtonClass} onClick={() => setShowSearch(true)}>
        Registrar pago
      </button>

      {showSearch && (
        <div className={md3ModalBackdropClass}>
          <div className={`${md3SurfaceClass} ${md3ModalPanelAnimClass} w-full max-w-md shadow-2xl`}>
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-on-surface">Registrar pago</h3>
                <button type="button" onClick={() => { setShowSearch(false); setSearch(''); }}
                  className="rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <label className={md3InputLabelClass}>Buscar miembro</label>
              <input
                className={md3TextFieldClass}
                placeholder="Nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {results.length > 0 && (
                <div className="mt-2 max-h-56 divide-y divide-outline-variant/40 overflow-y-auto rounded-xl border border-outline-variant">
                  {results.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(m.id);
                        setShowSearch(false);
                        setSearch('');
                      }}
                      className="flex w-full items-center justify-between p-2.5 text-left transition hover:bg-on-surface/4"
                    >
                      <span className="font-medium text-on-surface">{m.full_name}</span>
                      <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>{m.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {search.trim() && results.length === 0 && (
                <p className={`mt-2 text-on-surface-variant ${md3BodyMediumClass}`}>Sin resultados.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedMemberId !== null && (
        <RenewModal memberId={selectedMemberId} onClose={() => setSelectedMemberId(null)} />
      )}
    </>
  );
};

// ─── Vencimientos ─────────────────────────────────────────────────────────────

const ExpiringSubscriptionsTab = () => {
  const [days, setDays] = useState(7);
  const { data: subscriptions = [], isLoading } = useExpiringSubscriptions(days);

  const overdue = subscriptions.filter((s) => s.status === 'expired');
  const upcoming = subscriptions.filter((s) => s.status !== 'expired');

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
          Miembros con membresía vencida o próxima a vencer. Entra a la ficha del miembro para cobrar/renovar.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className={`rounded-full cursor-pointer border px-4 py-2 text-sm font-medium transition ${
                days === opt.days
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {!isLoading && (
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-error-container px-3 py-1 text-[11px] font-semibold text-on-error-container">
              {overdue.length} vencida{overdue.length !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full bg-secondary-container px-3 py-1 text-[11px] font-semibold text-on-secondary-container">
              {upcoming.length} por vencer
            </span>
          </div>
        )}
      </section>

      <section className={`${md3SurfaceClass} overflow-hidden`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : subscriptions.length === 0 ? (
          <p className={`p-8 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
            Ningún miembro vence en los próximos {days} días.
          </p>
        ) : (
          <div className="divide-y divide-outline-variant/40">
            {subscriptions.map((s) => {
              const cfg = SUBSCRIPTION_STATUS_CONFIG[s.status];
              return (
                <Link
                  key={s.id}
                  to={`/members/${s.member_id}`}
                  className="flex flex-col gap-2 p-5 transition hover:bg-on-surface/4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-on-surface">{s.member_name}</p>
                    <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{s.plan_name}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                      {new Date(s.end_date).toLocaleDateString('es')}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

// ─── Historial de pagos ───────────────────────────────────────────────────────

const PaymentHistoryTab = () => {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [search, setSearch] = useState('');
  const formatMoney = useCurrencyFormatter();

  const { data: payments = [], isLoading } = usePayments({
    date_from: dateFrom,
    date_to: dateTo,
    ...(method ? { method } : {}),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => p.member_name.toLowerCase().includes(q));
  }, [payments, search]);

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={md3InputLabelClass}>Desde</label>
            <input type="date" className={md3TextFieldClass} value={dateFrom}
              max={dateTo} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className={md3InputLabelClass}>Hasta</label>
            <input type="date" className={md3TextFieldClass} value={dateTo}
              min={dateFrom} max={defaultDateTo()} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className={md3InputLabelClass}>Método</label>
            <select className={`${md3TextFieldClass} appearance-none`}
              value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}>
              <option value="">Todos</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className={md3InputLabelClass}>Buscar miembro</label>
            <input className={md3TextFieldClass} placeholder="Nombre..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </section>

      <section className={`${md3SurfaceClass} overflow-hidden`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className={`p-8 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
            No hay pagos registrados en este rango.
          </p>
        ) : (
          <ScrollableTableWrapper>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/60 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Miembro</th>
                  <th className="px-5 py-3">Monto</th>
                  <th className="px-5 py-3">Método</th>
                  <th className="px-5 py-3">Cobrado por</th>
                  <th className="px-5 py-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition hover:bg-on-surface/4">
                    <td className={`whitespace-nowrap px-5 py-3 text-on-surface-variant ${md3BodyMediumClass}`}>
                      {new Date(p.paid_at).toLocaleDateString('es')}
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/members/${p.member_id}`} className="font-medium text-on-surface hover:underline">
                        {p.member_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-medium text-on-surface">{formatMoney(p.amount)}</td>
                    <td className={`px-5 py-3 text-on-surface-variant ${md3BodyMediumClass}`}>
                      {PAYMENT_METHOD_LABELS[p.method]}
                    </td>
                    <td className={`px-5 py-3 text-on-surface-variant ${md3BodyMediumClass}`}>
                      {p.registered_by_name || '—'}
                    </td>
                    <td className={`px-5 py-3 text-on-surface-variant ${md3BodyMediumClass}`}>
                      {p.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTableWrapper>
        )}
      </section>
    </div>
  );
};

// ─── Página ────────────────────────────────────────────────────────────────────

const TABS = ['Vencimientos', 'Historial de pagos'] as const;

const GymBillingPage = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Vencimientos');

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className={md3OverlineClass}>Gestión</span>
            <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Pagos</h1>
          </div>
          <RegisterPaymentButton />
        </div>

        <div className="mt-6 flex gap-2 border-b border-outline-variant/60">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {tab === 'Vencimientos' ? <ExpiringSubscriptionsTab /> : <PaymentHistoryTab />}
    </div>
  );
};

export const BillingPage = () => {
  const organization = useOrgStore((state) => state.organization);

  if (organization?.business_type !== 'gym') {
    return <PlaceholderPage title="Pagos" />;
  }

  return <GymBillingPage />;
};
