import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import { PlaceholderPage } from '@/shared/components/PlaceholderPage';
import {
  md3BodyMediumClass,
  md3HeadlineMediumClass,
  md3OverlineClass,
  md3SurfaceClass,
} from '@/shared/ui/material';
import { SUBSCRIPTION_STATUS_CONFIG } from '../constants';
import { useExpiringSubscriptions } from '../hooks/useBilling';

const WINDOW_OPTIONS = [
  { days: 7, label: '7 días' },
  { days: 15, label: '15 días' },
  { days: 30, label: '30 días' },
];

const GymBillingWorklist = () => {
  const [days, setDays] = useState(7);
  const { data: subscriptions = [], isLoading } = useExpiringSubscriptions(days);

  const overdue = subscriptions.filter((s) => s.status === 'expired');
  const upcoming = subscriptions.filter((s) => s.status !== 'expired');

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Gestión</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Pagos</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Miembros con membresía vencida o próxima a vencer. Entra a la ficha del miembro para cobrar/renovar.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
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

export const BillingPage = () => {
  const organization = useOrgStore((state) => state.organization);

  if (organization?.business_type !== 'gym') {
    return <PlaceholderPage title="Pagos" />;
  }

  return <GymBillingWorklist />;
};
