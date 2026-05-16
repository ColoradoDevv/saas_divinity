import { Link } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore } from '@/app/store/org';
import {
  md3BodyLargeClass,
  md3BodyMediumClass,
  md3HeadlineMediumClass,
  md3LabelLargeClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getFormattedDate = (): string =>
  new Date().toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const getInitials = (firstName?: string, lastName?: string, username?: string) => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (username) return username[0].toUpperCase();
  return '?';
};

// ─── Stat icons ───────────────────────────────────────────────────────────────

const ClientsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const PaymentsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const AttendanceIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <path d="m9 16 2 2 4-4" />
  </svg>
);

const PendingIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

// ─── KPI data ─────────────────────────────────────────────────────────────────

const stats = [
  {
    label: 'Clientes activos',
    value: '—',
    sub: 'Registros en el sistema',
    icon: ClientsIcon,
    iconBg: 'bg-primary-container text-primary',
  },
  {
    label: 'Pagos del mes',
    value: '—',
    sub: 'Total facturado',
    icon: PaymentsIcon,
    iconBg: 'bg-secondary-container text-secondary',
  },
  {
    label: 'Asistencia',
    value: '—',
    sub: 'Promedio mensual',
    icon: AttendanceIcon,
    iconBg: 'bg-tertiary-container text-tertiary',
  },
  {
    label: 'Pendientes',
    value: '0',
    sub: 'Sin resolver',
    icon: PendingIcon,
    iconBg: 'bg-error-container text-error',
  },
];

// ─── Module shortcuts ─────────────────────────────────────────────────────────

const modules = [
  {
    to: '/clients',
    label: 'Clientes',
    description: 'Gestiona tu cartera de clientes activos.',
    accent: 'border-l-primary bg-primary-container/30 hover:bg-primary-container/50',
    badge: null,
  },
  {
    to: '/payments',
    label: 'Pagos',
    description: 'Control de facturación y cobros.',
    accent: 'border-l-secondary bg-secondary-container/30 hover:bg-secondary-container/50',
    badge: 'Próximamente',
  },
  {
    to: '/attendance',
    label: 'Asistencia',
    description: 'Registro y seguimiento de presencia.',
    accent: 'border-l-tertiary bg-tertiary-container/30 hover:bg-tertiary-container/50',
    badge: 'Próximamente',
  },
  {
    to: '/reports',
    label: 'Reportes',
    description: 'Análisis, métricas y estadísticas.',
    accent: 'border-l-secondary bg-surface-container hover:bg-surface-container-high',
    badge: 'Próximamente',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const organization = useOrgStore((state) => state.organization);
  const role = useOrgStore((state) => state.role);
  const greeting = getGreeting();
  const dateStr = getFormattedDate();

  return (
    <div className="space-y-6">

      {/* ── Welcome hero ── */}
      <section className={`${md3SurfaceClass} overflow-hidden p-6 sm:p-8`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className={md3OverlineClass}>Panel principal</span>
            <h2 className={`mt-2 ${md3HeadlineMediumClass}`}>
              {greeting}
              {user?.first_name ? (
                <span className="text-primary">, {user.first_name}</span>
              ) : null}
            </h2>
            <p className={`mt-2 capitalize text-on-surface-variant ${md3BodyLargeClass}`}>
              {dateStr}
            </p>
          </div>

          {/* Avatar */}
          <div className="flex h-[4.5rem] w-[4.5rem] flex-shrink-0 items-center justify-center self-start rounded-full bg-primary text-2xl font-semibold text-on-primary shadow-md sm:self-auto">
            {getInitials(user?.first_name, user?.last_name, user?.username)}
          </div>
        </div>

        {/* Quick status strip */}
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-container/50 px-3 py-1.5 text-[0.75rem] font-medium text-on-primary-container">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Sesión activa
          </span>

          {organization && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary-container/50 px-3 py-1.5 text-[0.75rem] font-medium text-on-secondary-container">
              {organization.name}
            </span>
          )}

          {role && (
            <span className="inline-flex items-center rounded-full border border-tertiary/20 bg-tertiary-container/50 px-3 py-1.5 text-[0.75rem] font-medium text-on-tertiary-container capitalize">
              {role}
            </span>
          )}

          <span className="inline-flex items-center rounded-full border border-outline-variant bg-surface-container px-3 py-1.5 text-[0.75rem] font-medium text-on-surface-variant">
            {user?.email ?? ''}
          </span>
        </div>
      </section>

      {/* ── Quick access ── */}
      <section>
        <h2 className={`mb-2 px-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Acceso rápido
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map(({ to, label, description, accent, badge }) => (
            <Link
              key={to}
              to={to}
              className={`group flex flex-col justify-between gap-4 rounded-[20px] border border-outline-variant/60 border-l-[3px] p-5 transition ${accent}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className={`${md3TitleMediumClass} text-on-surface`}>{label}</p>
                  {badge ? (
                    <span className="flex-shrink-0 rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                      {badge}
                    </span>
                  ) : null}
                </div>
                  <p className={`mt-1.5 text-on-surface-variant ${md3BodyMediumClass}`}>
                  {description}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-primary opacity-0 transition group-hover:opacity-100">
                Ir al módulo <ArrowRightIcon />
              </span>
            </Link>
          ))}
        </div>
      </section>
      
      {/* ── KPI stats ── */}
      <section>
        <h2 className={`mb-3 px-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Resumen general
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, sub, icon: Icon, iconBg }) => (
            <article
              key={label}
              className="flex flex-col gap-4 rounded-[20px] border border-outline-variant/70 bg-surface-container-low p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg}`}>
                <Icon />
              </div>
              <div>
                <strong className="block text-[1.75rem] font-semibold leading-none tracking-tight text-on-surface">
                  {value}
                </strong>
                <p className={`mt-1 text-on-surface-variant ${md3LabelLargeClass}`}>{label}</p>
                <p className="mt-0.5 text-[11px] text-on-surface-variant/70">{sub}</p>
              </div>
            </article>
          ))}
        </div>
      </section>



    </div>
  );
};
