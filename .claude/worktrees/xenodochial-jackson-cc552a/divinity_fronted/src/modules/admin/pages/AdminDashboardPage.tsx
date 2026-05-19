import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import { api } from '@/shared/api/api';
import {
  md3BodyMediumClass,
  md3CardClass,
  md3HeadlineMediumClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';

interface OrgSummary {
  id: number;
  name: string;
  plan: 'pro' | 'enterprise';
  is_active: boolean;
  onboarding_completed: boolean;
  member_count: number;
  worker_count: number;
  payment_status: 'paid' | 'unpaid' | 'overdue';
  created_at: string;
}

const fetchOrgs = async (): Promise<OrgSummary[]> => {
  const res = await api.get('/organizations/super/');
  return res.data;
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

const planBadge: Record<string, string> = {
  pro: 'bg-primary-container text-on-primary-container',
  enterprise: 'bg-secondary-container text-on-secondary-container',
};

const QuickLinks = [
  {
    to: '/admin/organizations',
    label: 'Gestionar Empresas',
    description: 'Crear y administrar organizaciones',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="20" x="4" y="2" rx="2" /><path d="M9 22v-4h6v4" />
        <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
      </svg>
    ),
  },
  {
    to: '/admin/payments',
    label: 'Gestionar Pagos',
    description: 'Revisar y actualizar estados de pago',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    to: '/admin/system',
    label: 'Estado del Sistema',
    description: 'Información técnica y configuración',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export const AdminDashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['super', 'orgs'],
    queryFn: fetchOrgs,
  });

  const totalWorkers = orgs.reduce((sum, o) => sum + o.worker_count, 0);
  const activeCount = orgs.filter((o) => o.is_active).length;
  const paidCount = orgs.filter((o) => o.payment_status === 'paid').length;
  const unpaidCount = orgs.filter((o) => o.payment_status === 'unpaid').length;
  const overdueCount = orgs.filter((o) => o.payment_status === 'overdue').length;
  const pendingOnboarding = orgs.filter((o) => !o.onboarding_completed).length;

  const recentOrgs = [...orgs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const stats = [
    { label: 'Total empresas', value: orgs.length, color: 'text-on-surface', sub: `${activeCount} activas` },
    { label: 'Trabajadores', value: totalWorkers, color: 'text-on-surface', sub: 'en total' },
    { label: 'Pagadas', value: paidCount, color: 'text-[#065f46] dark:text-[#6ee7b7]', sub: 'al corriente' },
    { label: 'Pendientes', value: unpaidCount, color: 'text-[#713f12] dark:text-[#fde68a]', sub: 'por cobrar' },
    { label: 'Vencidas', value: overdueCount, color: 'text-error', sub: 'requieren atención' },
    { label: 'Sin configurar', value: pendingOnboarding, color: 'text-on-surface-variant', sub: 'onboarding pendiente' },
  ];

  return (
    <div className="space-y-6">

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Super Admin</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>
          Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}
        </h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Vista general del sistema Divinity —{' '}
          {isLoading ? '...' : `${orgs.length} empresa${orgs.length !== 1 ? 's' : ''} registrada${orgs.length !== 1 ? 's' : ''}`}.
        </p>
      </section>

      <section>
        <h2 className={`mb-3 px-1 ${md3TitleMediumClass} text-on-surface-variant`}>Métricas globales</h2>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map(({ label, value, color, sub }) => (
              <div key={label} className={`${md3CardClass} flex flex-col gap-1 px-4 py-4`}>
                <p className={`text-3xl font-semibold leading-none ${color}`}>{value}</p>
                <p className={`font-medium text-on-surface ${md3BodyMediumClass}`}>{label}</p>
                <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{sub}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">

        <section className={`${md3SurfaceClass} p-6 lg:col-span-2`}>
          <h2 className={`mb-4 ${md3TitleMediumClass}`}>Accesos rápidos</h2>
          <div className="space-y-3">
            {QuickLinks.map(({ to, label, description, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-4 rounded-[16px] border border-outline-variant/60 bg-surface-container-low p-4 transition hover:bg-surface-container"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                  <Icon />
                </div>
                <div className="min-w-0">
                  <p className={`font-medium text-on-surface ${md3BodyMediumClass}`}>{label}</p>
                  <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{description}</p>
                </div>
                <svg className="ml-auto flex-shrink-0 text-on-surface-variant" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${md3SurfaceClass} p-6 lg:col-span-3`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className={md3TitleMediumClass}>Empresas recientes</h2>
            <Link to="/admin/organizations" className="text-[0.8125rem] font-medium text-primary transition hover:text-primary/80">
              Ver todas →
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            </div>
          ) : recentOrgs.length === 0 ? (
            <p className={`py-6 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
              No hay empresas registradas.
            </p>
          ) : (
            <div className="space-y-2">
              {recentOrgs.map((org) => (
                <div key={org.id} className="flex items-center gap-3 rounded-[12px] border border-outline-variant/50 bg-surface-container-low px-4 py-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-[11px] font-bold text-on-secondary-container">
                    {org.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium text-on-surface ${md3BodyMediumClass}`}>{org.name}</p>
                    <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                      {org.member_count} miembro{org.member_count !== 1 ? 's' : ''} · {org.worker_count} trabajador{org.worker_count !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${planBadge[org.plan] ?? planBadge.pro}`}>
                      {org.plan}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${paymentBadge[org.payment_status]}`}>
                      {paymentLabel[org.payment_status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
