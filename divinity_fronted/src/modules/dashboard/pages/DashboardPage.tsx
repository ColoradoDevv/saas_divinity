import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore } from '@/app/store/org';
import { useTasks, useUpdateTask } from '@/modules/workers/hooks/useWorkers';
import type { Task } from '@/modules/workers/types';
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

// ─── My Tasks panel ───────────────────────────────────────────────────────────

const TASK_PRIORITY_META = {
  high:   { label: 'Alta',  dot: 'bg-error',              border: 'border-l-error',     text: 'text-error' },
  medium: { label: 'Media', dot: 'bg-secondary',          border: 'border-l-secondary', text: 'text-secondary' },
  low:    { label: 'Baja',  dot: 'bg-on-surface-variant', border: 'border-l-outline',   text: 'text-on-surface-variant' },
} as const;

const TASK_STATUS_META = {
  pending:     { label: 'Pendiente',   cls: 'bg-surface-container-high text-on-surface-variant' },
  in_progress: { label: 'En progreso', cls: 'bg-primary-container text-on-primary-container' },
  done:        { label: 'Completada',  cls: 'bg-tertiary-container text-on-tertiary-container' },
  cancelled:   { label: 'Cancelada',   cls: 'bg-error-container/50 text-on-error-container' },
} as const;

interface DueDateInfo {
  label: string;
  cls: string;
  urgent: boolean;
}

const getDueDateInfo = (dueDate: string | null, status: Task['status']): DueDateInfo | null => {
  if (!dueDate || status === 'done' || status === 'cancelled') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0)
    return { label: `Vencida hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`, cls: 'bg-error-container/60 text-error', urgent: true };
  if (diff === 0)
    return { label: 'Vence hoy', cls: 'bg-secondary-container text-on-secondary-container', urgent: true };
  if (diff === 1)
    return { label: 'Vence mañana', cls: 'bg-surface-container-high text-on-surface-variant', urgent: false };
  return { label: `En ${diff} días`, cls: 'bg-surface-container text-on-surface-variant', urgent: false };
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

const sortActiveTasks = (tasks: Task[]): Task[] =>
  [...tasks]
    .filter((t) => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => {
      // Overdue first, then today, then by priority, then by due date
      const aInfo = getDueDateInfo(a.due_date, a.status);
      const bInfo = getDueDateInfo(b.due_date, b.status);
      if (aInfo?.urgent && !bInfo?.urgent) return -1;
      if (!aInfo?.urgent && bInfo?.urgent) return 1;
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });

const MyTasksPanel = () => {
  const { data: allTasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const [showAll, setShowAll] = useState(false);

  const activeTasks = sortActiveTasks(allTasks);
  const LIMIT = 4;
  const visible = showAll ? activeTasks : activeTasks.slice(0, LIMIT);
  const hasMore = activeTasks.length > LIMIT;

  const advance = (task: Task) => {
    const next: Task['status'] = task.status === 'pending' ? 'in_progress' : 'done';
    updateTask.mutate({ id: task.id, payload: { status: next } });
  };

  return (
    <section>
      {/* Header */}
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <h2 className={`font-semibold text-on-surface ${md3TitleMediumClass}`}>Mis tareas</h2>
        </div>
        {!isLoading && activeTasks.length > 0 && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            activeTasks.some((t) => getDueDateInfo(t.due_date, t.status)?.urgent)
              ? 'bg-error text-on-error'
              : 'bg-primary-container text-on-primary-container'
          }`}>
            {activeTasks.length}
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-container" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && activeTasks.length === 0 && (
        <div className={`${md3SurfaceClass} flex flex-col items-center justify-center gap-3 py-10 text-center`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-container">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-on-tertiary-container">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-on-surface">¡Estás al día!</p>
            <p className={`mt-0.5 text-on-surface-variant ${md3BodyMediumClass}`}>
              No tienes tareas pendientes por el momento.
            </p>
          </div>
        </div>
      )}

      {/* Task list */}
      {!isLoading && visible.length > 0 && (
        <div className="space-y-2.5">
          {visible.map((task) => {
            const priority = TASK_PRIORITY_META[task.priority];
            const dueDateInfo = getDueDateInfo(task.due_date, task.status);
            const isUpdating = updateTask.isPending && updateTask.variables?.id === task.id;

            return (
              <div
                key={task.id}
                className={`group flex items-center gap-4 rounded-2xl border border-outline-variant/60 border-l-[3px] bg-surface px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all ${priority.border} ${
                  isUpdating ? 'opacity-60' : 'hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)]'
                }`}
              >
                {/* Priority dot */}
                <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${priority.dot}`} />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-on-surface leading-tight ${md3BodyMediumClass} ${
                    task.status === 'in_progress' ? 'text-primary' : ''
                  }`}>
                    {task.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TASK_STATUS_META[task.status].cls}`}>
                      {TASK_STATUS_META[task.status].label}
                    </span>
                    {dueDateInfo && (
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${dueDateInfo.cls}`}>
                        {dueDateInfo.urgent && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        )}
                        {dueDateInfo.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action button */}
                {task.status !== 'done' && task.status !== 'cancelled' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => advance(task)}
                    className={`flex-shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                      task.status === 'pending'
                        ? 'bg-primary-container/50 text-primary hover:bg-primary-container'
                        : 'bg-tertiary-container/60 text-on-tertiary-container hover:bg-tertiary-container'
                    }`}
                  >
                    {isUpdating ? '...' : task.status === 'pending' ? 'Iniciar' : 'Completar'}
                  </button>
                )}
              </div>
            );
          })}

          {/* Show more / less */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full rounded-2xl border border-dashed border-outline-variant py-2.5 text-xs font-medium text-on-surface-variant transition hover:bg-on-surface/4"
            >
              {showAll ? 'Ver menos' : `Ver ${activeTasks.length - LIMIT} tarea${activeTasks.length - LIMIT !== 1 ? 's' : ''} más`}
            </button>
          )}
        </div>
      )}
    </section>
  );
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
        </div>
      </section>

      {/* ── My Tasks — only for staff workers ── */}
      {role === 'staff' && <MyTasksPanel />}

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
