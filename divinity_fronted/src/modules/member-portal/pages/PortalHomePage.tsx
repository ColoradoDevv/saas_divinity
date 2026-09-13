import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { SUBSCRIPTION_STATUS_CONFIG } from '@/modules/billing/constants';
import {
  md3BodyMediumClass,
  md3HeadlineMediumClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import { formatMoney } from '@/shared/utils/currency';
import { usePortalBilling } from '../hooks/useMemberPortal';

export const PortalHomePage = () => {
  const member = useMemberPortalAuthStore((s) => s.member);
  const { data: billing, isLoading } = usePortalBilling();

  const currency = member?.organization_currency ?? 'COP';
  const current = billing?.current_subscription ?? null;

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Hola</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>{member?.first_name}</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Miembro de {member?.organization_name}
        </p>
      </section>

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <h2 className={md3TitleMediumClass}>Tu membresía</h2>
        {isLoading ? (
          <div className="mt-4 flex justify-center py-6">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : !current ? (
          <p className={`mt-3 text-on-surface-variant ${md3BodyMediumClass}`}>
            No tienes un plan activo en este momento. Consulta con el staff para renovar.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-on-surface">{current.plan_name}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${SUBSCRIPTION_STATUS_CONFIG[current.status].cls}`}>
                {SUBSCRIPTION_STATUS_CONFIG[current.status].label}
              </span>
            </div>
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              Vence el {new Date(`${current.end_date}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}
      </section>

      {billing && billing.payments.length > 0 && (
        <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
          <h2 className={md3TitleMediumClass}>Último pago</h2>
          <p className={`mt-3 text-on-surface-variant ${md3BodyMediumClass}`}>
            {formatMoney(billing.payments[0].amount, currency)} — {new Date(`${billing.payments[0].paid_at}T00:00:00`).toLocaleDateString('es')}
          </p>
        </section>
      )}
    </div>
  );
};
