import { useQuery } from '@tanstack/react-query';

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
  is_active: boolean;
  member_count: number;
  worker_count: number;
}

const fetchOrgs = async (): Promise<OrgSummary[]> => {
  const res = await api.get('/organizations/super/');
  return res.data;
};

const InfoRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>{label}</span>
    <span className={`text-right font-medium ${highlight ? 'text-primary' : 'text-on-surface'} ${md3BodyMediumClass}`}>
      {value}
    </span>
  </div>
);

export const AdminSystemPage = () => {
  const user = useAuthStore((state) => state.user);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['super', 'orgs'],
    queryFn: fetchOrgs,
  });

  const now = new Date();
  const sessionStart = now.toLocaleString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const totalMembers = orgs.reduce((sum, o) => sum + o.member_count, 0);
  const totalWorkers = orgs.reduce((sum, o) => sum + o.worker_count, 0);
  const activeOrgs = orgs.filter((o) => o.is_active).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Sistema</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Estado del sistema</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Información técnica y resumen operativo de la plataforma Divinity.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">

        {/* Platform info */}
        <section className={`${md3SurfaceClass} p-6`}>
          <h2 className={`mb-1 ${md3TitleMediumClass}`}>Plataforma</h2>
          <p className={`mb-4 text-on-surface-variant ${md3BodyMediumClass}`}>Versión y entorno de ejecución.</p>
          <div className="divide-y divide-outline-variant/40">
            <InfoRow label="Producto" value="Divinity SaaS Suite" />
            <InfoRow label="Versión" value="1.0.0" highlight />
            <InfoRow label="Entorno" value="Producción" />
            <InfoRow label="Backend" value="Django REST Framework" />
            <InfoRow label="Frontend" value="React + Vite + Tailwind" />
          </div>
        </section>

        {/* Session info */}
        <section className={`${md3SurfaceClass} p-6`}>
          <h2 className={`mb-1 ${md3TitleMediumClass}`}>Sesión activa</h2>
          <p className={`mb-4 text-on-surface-variant ${md3BodyMediumClass}`}>Datos del superadministrador en sesión.</p>
          <div className="divide-y divide-outline-variant/40">
            <InfoRow label="Usuario" value={user?.username ?? '—'} />
            <InfoRow label="Email" value={user?.email ?? '—'} highlight />
            <InfoRow label="Nombre" value={user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : '—'} />
            <InfoRow label="Rol" value="Super Administrador" />
            <InfoRow label="Acceso desde" value={sessionStart} />
          </div>
        </section>

        {/* DB summary */}
        <section className={`${md3SurfaceClass} p-6`}>
          <h2 className={`mb-1 ${md3TitleMediumClass}`}>Base de datos</h2>
          <p className={`mb-4 text-on-surface-variant ${md3BodyMediumClass}`}>Registros activos en el sistema.</p>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/40">
              <InfoRow label="Total organizaciones" value={String(orgs.length)} />
              <InfoRow label="Organizaciones activas" value={String(activeOrgs)} highlight />
              <InfoRow label="Total usuarios (admins)" value={String(totalMembers)} />
              <InfoRow label="Total trabajadores" value={String(totalWorkers)} />
              <InfoRow label="Usuarios en sistema" value={String(totalMembers + totalWorkers + 1)} />
            </div>
          )}
        </section>

        {/* Status indicators */}
        <section className={`${md3SurfaceClass} p-6`}>
          <h2 className={`mb-1 ${md3TitleMediumClass}`}>Estado de servicios</h2>
          <p className={`mb-4 text-on-surface-variant ${md3BodyMediumClass}`}>Salud de los componentes del sistema.</p>
          <div className="space-y-3">
            {[
              { label: 'API Backend', status: 'Operativo', ok: true },
              { label: 'Autenticación JWT', status: 'Operativo', ok: true },
              { label: 'Base de datos SQLite', status: 'Operativo', ok: true },
              { label: 'Sistema de módulos', status: 'Operativo', ok: true },
            ].map(({ label, status, ok }) => (
              <div key={label} className={`${md3CardClass} flex items-center justify-between px-4 py-3`}>
                <span className={`font-medium text-on-surface ${md3BodyMediumClass}`}>{label}</span>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${ok ? 'bg-[#22c55e]' : 'bg-error'}`} />
                  <span className={`text-[11px] font-semibold ${ok ? 'text-[#15803d] dark:text-[#4ade80]' : 'text-error'}`}>
                    {status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};
