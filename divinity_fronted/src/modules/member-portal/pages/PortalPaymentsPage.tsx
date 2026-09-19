import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { PAYMENT_METHOD_LABELS } from '@/modules/billing/constants';
import { md3BodyMediumClass, md3HeadlineMediumClass, md3SurfaceClass } from '@/shared/ui/material';
import { formatMoney } from '@/shared/utils/currency';
import { usePortalBilling } from '../hooks/useMemberPortal';

const METHOD_ICON: Record<string, string> = {
  cash: 'M6 12h12M6 12a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2M6 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2',
  card: 'M3 8h18M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
  transfer: 'M7 7h10l-3-3M17 17H7l3 3M4 12h16',
  other: 'M12 2v20M2 12h20',
};

const MethodIcon = ({ method }: { method: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={METHOD_ICON[method] ?? METHOD_ICON.other} />
  </svg>
);

export const PortalPaymentsPage = () => {
  const member = useMemberPortalAuthStore((s) => s.member);
  const { data: billing, isLoading } = usePortalBilling();
  const currency = member?.organization_currency ?? 'COP';

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className={md3HeadlineMediumClass}>Mis pagos</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>Historial de cuotas registradas.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        </div>
      ) : !billing || billing.payments.length === 0 ? (
        <div className="rounded-[28px] border-2 border-dashed border-outline-variant p-6 text-center">
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Todavía no hay pagos registrados.</p>
        </div>
      ) : (
        <div className={`${md3SurfaceClass} divide-y divide-outline-variant/40 overflow-hidden`}>
          {billing.payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                <MethodIcon method={p.method} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-on-surface">{formatMoney(p.amount, currency)}</p>
                <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                  {new Date(`${p.paid_at}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-surface-container-high px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
                {PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
