import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore } from '@/app/store/org';
import { useTasks, useUpdateTask } from '@/modules/workers/hooks/useWorkers';
import type { Task } from '@/modules/workers/types';
import {
  md3BodyMediumClass,
  md3HeadlineMediumClass,
  md3BodyLargeClass,
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
  icon: ReactNode;
  iconBg: string;
  comingSoon?: boolean;
}

const SHORTCUTS_CATALOG: ShortcutDef[] = [
  {
    key: 'members-list',
    module: 'clients',
    to: '/members',
    label: 'Miembros',
    description: 'Registra y consulta los miembros de tu negocio',
    iconBg: 'bg-primary-container text-primary',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'workers-list',
    module: 'workers',
    to: '/workers',
    label: 'Mi equipo',
    description: 'Gestiona a los trabajadores de tu negocio',
    iconBg: 'bg-secondary-container text-secondary',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: 'workers-tasks',
    module: 'workers',
    to: '/workers',
    label: 'Tareas',
    description: 'Asigna y hace seguimiento de tareas del equipo',
    iconBg: 'bg-secondary-container text-secondary',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    key: 'payments-list',
    module: 'payments',
    to: '/payments',
    label: 'Pagos',
    description: 'Controla cobros, cuotas y facturación',
    iconBg: 'bg-tertiary-container text-tertiary',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    key: 'attendance-list',
    module: 'attendance',
    to: '/attendance',
    label: 'Asistencia',
    description: 'Registra entradas, salidas y horarios',
    iconBg: 'bg-surface-container-high text-on-surface-variant',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
  {
    key: 'reports-list',
    module: 'reports',
    to: '/reports',
    label: 'Reportes',
    description: 'Estadísticas e informes del rendimiento',
    iconBg: 'bg-surface-container-high text-on-surface-variant',
    comingSoon: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
];

// ─── Shortcuts storage ────────────────────────────────────────────────────────

const storageKey = (userId: number) => `divinity-shortcuts-v2-${userId}`;

const loadShortcuts = (userId: number, activeModules: string[]): string[] => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      return parsed.filter((k) => {
        const def = SHORTCUTS_CATALOG.find((s) => s.key === k);
        return def && activeModules.includes(def.module);
      });
    }
  } catch { /* ignore */ }
  // Default: first shortcut per active module
  return SHORTCUTS_CATALOG
    .filter((s) => activeModules.includes(s.module))
    .reduce<string[]>((acc, s) => {
      const already = acc.some((k) => SHORTCUTS_CATALOG.find((x) => x.key === k)?.module === s.module);
      if (!already) acc.push(s.key);
      return acc;
    }, []);
};

const saveShortcuts = (userId: number, keys: string[]) => {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(keys)); } catch { /* ignore */ }
};

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
        <div className="mb-4 flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">Acceso rápido</h2>
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              {editing ? 'Activa o desactiva los accesos que quieres ver' : 'Toca cualquier tarjeta para ir al módulo'}
            </p>
          </div>
          {availableShortcuts.length > 0 && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                editing
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
              }`}
            >
              {editing ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Listo
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 1.41 13.85M4.93 4.93a10 10 0 0 0 0 14.14" /></svg>
                  Personalizar
                </>
              )}
            </button>
          )}
        </div>

        {/* Grid unificado: en modo edición muestra todos con toggle; en modo normal solo los activos */}
        {availableShortcuts.length === 0 ? (
          <div className={`${md3SurfaceClass} p-10 text-center`}>
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              Tu organización no tiene módulos habilitados aún.
            </p>
          </div>
        ) : editing ? (
          /* ── Modo personalización ── */
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableShortcuts.map((s) => {
              const active = selectedKeys.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleShortcut(s.key)}
                  className={`group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? 'border-primary bg-primary-container/20 shadow-sm'
                      : 'border-outline-variant/60 bg-surface opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* Icon */}
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-colors ${
                    active ? s.iconBg : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {s.icon}
                  </div>
                  {/* Label */}
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold leading-tight ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-xs text-on-surface-variant leading-snug">{s.description}</p>
                  </div>
                  {/* Toggle indicator */}
                  <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    active ? 'border-primary bg-primary' : 'border-outline-variant'
                  }`}>
                    {active && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  {s.comingSoon && (
                    <span className="absolute right-3 top-2.5 rounded-full bg-surface-container-high px-2 py-0.5 text-[9px] font-semibold text-on-surface-variant">
                      Próximamente
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : visibleShortcuts.length === 0 ? (
          <div className={`${md3SurfaceClass} p-8 text-center`}>
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              No tienes accesos activos.{' '}
              <button type="button" onClick={() => setEditing(true)} className="font-semibold text-primary hover:underline">
                Personaliza tu panel
              </button>
            </p>
          </div>
        ) : (
          /* ── Modo normal: grid de tarjetas ── */
          <div className={`grid gap-4 sm:grid-cols-2 ${
            visibleShortcuts.length >= 4 ? 'lg:grid-cols-4'
              : visibleShortcuts.length === 3 ? 'lg:grid-cols-3'
              : 'lg:grid-cols-2'
          }`}>
            {visibleShortcuts.map((s) => (
              <Link
                key={s.key}
                to={s.to}
                className={`group relative flex flex-col gap-4 rounded-2xl border border-outline-variant/50 bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  s.comingSoon ? 'pointer-events-none' : ''
                }`}
              >
                {/* Coming soon overlay */}
                {s.comingSoon && (
                  <span className="absolute right-3 top-3 rounded-full bg-surface-container-high px-2.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                    Próximamente
                  </span>
                )}
                {/* Icon block */}
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.comingSoon ? 'bg-surface-container text-on-surface-variant' : s.iconBg}`}>
                  {s.icon}
                </div>
                {/* Text */}
                <div className="flex-1">
                  <p className="font-semibold text-on-surface leading-tight">{s.label}</p>
                  <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>{s.description}</p>
                </div>
                {/* CTA */}
                {!s.comingSoon && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    Abrir
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
