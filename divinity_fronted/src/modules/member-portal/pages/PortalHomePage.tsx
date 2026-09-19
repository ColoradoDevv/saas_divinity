import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { SUBSCRIPTION_STATUS_CONFIG } from '@/modules/billing/constants';
import { md3BodyMediumClass, md3SurfaceClass, md3TitleMediumClass } from '@/shared/ui/material';
import { formatMoney } from '@/shared/utils/currency';
import { usePortalBilling } from '../hooks/useMemberPortal';

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
    <path d="M8 3.5v4M16 3.5v4M3.5 10.5h17" />
  </svg>
);

const ChipIcon = () => (
  <svg width="30" height="22" viewBox="0 0 30 22" fill="none" aria-hidden="true">
    <rect x="0.5" y="0.5" width="29" height="21" rx="4" fill="currentColor" fillOpacity="0.28" />
    <path d="M0.5 7.5h29M0.5 14.5h29M10 0.5v21M20 0.5v21" stroke="currentColor" strokeOpacity="0.45" />
  </svg>
);

const ReceiptIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

const getInitials = (first?: string, last?: string) =>
  `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

export const PortalHomePage = () => {
  const member = useMemberPortalAuthStore((s) => s.member);
  const { data: billing, isLoading } = usePortalBilling();

  const currency = member?.organization_currency ?? 'COP';
  const current = billing?.current_subscription ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-base font-bold text-on-primary-container">
          {getInitials(member?.first_name, member?.last_name)}
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold leading-tight text-on-surface">Hola, {member?.first_name}</p>
          <p className={`truncate text-on-surface-variant ${md3BodyMediumClass}`}>{member?.organization_name}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center rounded-[28px] bg-surface-container-low py-14">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        </div>
      ) : !current ? (
        <div className="rounded-[28px] border-2 border-dashed border-outline-variant p-6 text-center">
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
            No tienes un plan activo en este momento. Consulta con el staff para renovar.
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-primary via-primary to-secondary p-6 text-on-primary shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <div className="absolute -right-6 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -right-2 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-3">
            <ChipIcon />
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm">
              {SUBSCRIPTION_STATUS_CONFIG[current.status].label}
            </span>
          </div>
          <p className="relative mt-5 text-2xl font-semibold leading-tight">{current.plan_name}</p>
          <div className="relative mt-4 flex items-center gap-1.5 text-on-primary/85">
            <CalendarIcon />
            <p className="text-sm">
              Vence el {new Date(`${current.end_date}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <p className="relative mt-4 text-xs tracking-[0.08em] text-on-primary/70">
            {member?.member_code}
          </p>
        </div>
      )}

      {billing && billing.payments.length > 0 && (
        <div>
          <h2 className={`mb-2 px-1 ${md3TitleMediumClass}`}>Último pago</h2>
          <div className={`${md3SurfaceClass} flex items-center gap-3 p-4`}>
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container">
              <ReceiptIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-on-surface">{formatMoney(billing.payments[0].amount, currency)}</p>
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                {new Date(`${billing.payments[0].paid_at}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
