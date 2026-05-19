import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore } from '@/app/store/org';
import {
  md3BodyMediumClass,
  md3HeadlineMediumClass,
  md3BodyLargeClass,
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
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

const getInitials = (firstName?: string, lastName?: string, username?: string) => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (username) return username[0].toUpperCase();
  return '?';
};

// ─── Shortcuts catalog ────────────────────────────────────────────────────────

interface ShortcutDef {
  key: string;
  module: string;
  to: string;
  label: string;
  description: string;
  badge?: string;
}

const SHORTCUTS_CATALOG: ShortcutDef[] = [
  // Clientes
  { key: 'clients-list',    module: 'clients',    to: '/clients',    label: 'Ver clientes',      description: 'Lista completa de clientes registrados' },
  // Trabajadores
  { key: 'workers-list',    module: 'workers',    to: '/workers',    label: 'Ver equipo',         description: 'Trabajadores activos y sus perfiles' },
  { key: 'workers-tasks',   module: 'workers',    to: '/workers',    label: 'Tareas del equipo',  description: 'Gestionar y hacer seguimiento de tareas' },
  // Pagos
  { key: 'payments-list',   module: 'payments',   to: '/payments',   label: 'Ver pagos',          description: 'Control de facturación y cobros', badge: 'Próximamente' },
  // Asistencia
  { key: 'attendance-list', module: 'attendance', to: '/attendance', label: 'Asistencia',         description: 'Registro de presencia del equipo', badge: 'Próximamente' },
  { key: 'attendance-report', module: 'attendance', to: '/attendance', label: 'Reporte asistencia', description: 'Resumen mensual de presencia', badge: 'Próximamente' },
  // Reportes
  { key: 'reports-list',    module: 'reports',    to: '/reports',    label: 'Reportes',           description: 'Análisis y estadísticas del negocio', badge: 'Próximamente' },
  { key: 'reports-monthly', module: 'reports',    to: '/reports',    label: 'Resumen del mes',    description: 'Vista general del mes en curso', badge: 'Próximamente' },
];

const MODULE_LABELS: Record<string, string> = {
  clients: 'Clientes', workers: 'Trabajadores', payments: 'Pagos',
  attendance: 'Asistencia', reports: 'Reportes',
};

const MODULE_ACCENT: Record<string, string> = {
  clients:    'border-l-primary   bg-primary-container/30   hover:bg-primary-container/50',
  workers:    'border-l-primary   bg-primary-container/20   hover:bg-primary-container/40',
  payments:   'border-l-secondary bg-secondary-container/30 hover:bg-secondary-container/50',
  attendance: 'border-l-tertiary  bg-tertiary-container/30  hover:bg-tertiary-container/50',
  reports:    'border-l-secondary bg-surface-container       hover:bg-surface-container-high',
};

// ─── Shortcuts storage ────────────────────────────────────────────────────────

const storageKey = (userId: number) => `divinity-shortcuts-${userId}`;

const loadShortcuts = (userId: number, activeModules: string[]): string[] => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      // Filtrar claves que siguen siendo válidas para los módulos activos
      return parsed.filter((k) => {
        const def = SHORTCUTS_CATALOG.find((s) => s.key === k);
        return def && activeModules.includes(def.module);
      });
    }
  } catch { /* ignore */ }
  // Por defecto: primer shortcut de cada módulo activo
  return SHORTCUTS_CATALOG
    .filter((s) => activeModules.includes(s.module))
    .reduce<string[]>((acc, s) => {
      const moduleRepresented = acc.some((k) => {
        const d = SHORTCUTS_CATALOG.find((x) => x.key === k);
        return d?.module === s.module;
      });
      if (!moduleRepresented) acc.push(s.key);
      return acc;
    }, []);
};

const saveShortcuts = (userId: number, keys: string[]) => {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(keys)); } catch { /* ignore */ }
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── KPI stats ────────────────────────────────────────────────────────────────

const ActivityIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const stats = [
  { label: 'Clientes activos',  value: '—', sub: 'Registros en el sistema', iconBg: 'bg-primary-container text-primary' },
  { label: 'Pagos del mes',     value: '—', sub: 'Total facturado',          iconBg: 'bg-secondary-container text-secondary' },
  { label: 'Asistencia',        value: '—', sub: 'Promedio mensual',         iconBg: 'bg-tertiary-container text-tertiary' },
  { label: 'Pendientes',        value: '0', sub: 'Sin resolver',             iconBg: 'bg-error-container text-error' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const organization = useOrgStore((state) => state.organization);
  const role = useOrgStore((state) => state.role);
  const allowedModules = useOrgStore((state) => state.allowedModules);

  const greeting = getGreeting();
  const dateStr = getFormattedDate();

  const activeModules = allowedModules !== null
    ? allowedModules
    : (organization?.enabled_modules ?? []);

  const userId = user?.id ?? 0;

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    loadShortcuts(userId, activeModules)
  );
  const [editing, setEditing] = useState(false);

  const toggleShortcut = (key: string) => {
    setSelectedKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      saveShortcuts(userId, next);
      return next;
    });
  };

  const availableShortcuts = SHORTCUTS_CATALOG.filter((s) => activeModules.includes(s.module));
  const visibleShortcuts = availableShortcuts.filter((s) => selectedKeys.includes(s.key));

  // Agrupar por módulo para el panel de edición
  const byModule = activeModules.reduce<Record<string, ShortcutDef[]>>((acc, mod) => {
    acc[mod] = availableShortcuts.filter((s) => s.module === mod);
    return acc;
  }, {});

  return (
    <div className="space-y-6">

      {/* ── Welcome hero ── */}
      <section className={`${md3SurfaceClass} overflow-hidden p-6 sm:p-8`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className={md3OverlineClass}>Panel principal</span>
            <h2 className={`mt-2 ${md3HeadlineMediumClass}`}>
              {greeting}
              {user?.first_name && <span className="text-primary">, {user.first_name}</span>}
            </h2>
            <p className={`mt-2 capitalize text-on-surface-variant ${md3BodyLargeClass}`}>{dateStr}</p>
          </div>
          <div className="flex h-[4.5rem] w-[4.5rem] flex-shrink-0 items-center justify-center self-start rounded-full bg-primary text-2xl font-semibold text-on-primary shadow-md sm:self-auto">
            {getInitials(user?.first_name, user?.last_name, user?.username)}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-container/50 px-3 py-1.5 text-[0.75rem] font-medium text-on-primary-container">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />Sesión activa
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
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className={`text-on-surface-variant ${md3BodyMediumClass}`}>Acceso rápido</h2>
          {availableShortcuts.length > 0 && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                editing
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
              }`}>
              {editing ? <><CheckIcon /> Listo</> : <><EditIcon /> Personalizar</>}
            </button>
          )}
        </div>

        {/* Panel de edición */}
        {editing && (
          <div className={`${md3SurfaceClass} mb-4 p-5`}>
            <p className={`mb-4 text-on-surface-variant ${md3BodyMediumClass}`}>
              Selecciona los accesos que quieres ver en tu panel. Puedes elegir varios por módulo.
            </p>
            <div className="space-y-5">
              {Object.entries(byModule).map(([mod, shortcuts]) => (
                <div key={mod}>
                  <p className={`mb-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70`}>
                    {MODULE_LABELS[mod] ?? mod}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {shortcuts.map((s) => {
                      const active = selectedKeys.includes(s.key);
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => toggleShortcut(s.key)}
                          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                            active
                              ? 'border-primary bg-primary-container text-on-primary-container'
                              : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
                          }`}>
                          <span className={`h-2 w-2 flex-shrink-0 rounded-full transition ${active ? 'bg-primary' : 'bg-outline-variant'}`} />
                          {s.label}
                          {s.badge && (
                            <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-[9px] font-medium text-on-surface-variant">
                              {s.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shortcuts visibles */}
        {visibleShortcuts.length === 0 ? (
          <div className={`${md3SurfaceClass} p-8 text-center`}>
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              No tienes accesos rápidos seleccionados.{' '}
              <button type="button" onClick={() => setEditing(true)} className="text-primary underline">
                Personaliza tu panel
              </button>
            </p>
          </div>
        ) : (
          <div className={`grid gap-4 sm:grid-cols-2 ${
            visibleShortcuts.length >= 4 ? 'lg:grid-cols-4'
            : visibleShortcuts.length === 3 ? 'lg:grid-cols-3'
            : 'lg:grid-cols-2'
          }`}>
            {visibleShortcuts.map((s) => (
              <Link
                key={s.key}
                to={s.to}
                className={`group flex flex-col justify-between gap-4 rounded-[20px] border border-outline-variant/60 border-l-[3px] p-5 transition ${MODULE_ACCENT[s.module] ?? 'bg-surface-container hover:bg-surface-container-high'}`}>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`${md3TitleMediumClass} text-on-surface`}>{s.label}</p>
                    {s.badge && (
                      <span className="flex-shrink-0 rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1.5 text-on-surface-variant ${md3BodyMediumClass}`}>{s.description}</p>
                </div>
                <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  Ir al módulo <ArrowRightIcon />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── KPI stats ── */}
      <section>
        <h2 className={`mb-3 px-1 text-on-surface-variant ${md3BodyMediumClass}`}>Resumen general</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, sub, iconBg }) => (
            <article key={label}
              className="flex flex-col gap-4 rounded-[20px] border border-outline-variant/70 bg-surface-container-low p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg}`}>
                <ActivityIcon />
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
