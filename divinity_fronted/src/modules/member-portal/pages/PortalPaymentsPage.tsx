import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { PAYMENT_METHOD_LABELS } from '@/modules/billing/constants';
import {
  md3BodyMediumClass,
  md3HeadlineMediumClass,
  md3OverlineClass,
  md3SurfaceClass,
} from '@/shared/ui/material';
import { formatMoney } from '@/shared/utils/currency';
import { usePortalBilling } from '../hooks/useMemberPortal';

export const PortalPaymentsPage = () => {
  const member = useMemberPortalAuthStore((s) => s.member);
  const { data: billing, isLoading } = usePortalBilling();
  const currency = member?.organization_currency ?? 'COP';

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Portal del miembro</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Mis pagos</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>Historial de cuotas registradas.</p>
      </section>

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : !billing || billing.payments.length === 0 ? (
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Todavía no hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">Monto</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {billing.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 text-on-surface">{p.paid_at}</td>
                    <td className="px-4 py-2.5 text-on-surface">{formatMoney(p.amount, currency)}</td>
                    <td className="px-4 py-2.5 text-on-surface-variant">
                      {PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}
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
