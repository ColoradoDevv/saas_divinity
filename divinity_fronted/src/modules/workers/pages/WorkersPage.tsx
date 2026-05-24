import { useState } from 'react';

import {
  useCreateTask,
  useCreateWorker,
  useDeleteTask,
  useDeleteWorker,
  useTasks,
  useUpdateTask,
  useUpdateWorker,
  useWorkers,
} from '../hooks/useWorkers';
import type {
  CreateTaskPayload,
  GeneratedCredentials,
  Task,
  UpdateWorkerPayload,
  Worker,
} from '../types';
import { useOrgStore } from '@/app/store/org';
import {
  md3BodyMediumClass,
  md3CardClass,
  md3FilledButtonClass,
  md3HeadlineMediumClass,
  md3InputLabelClass,
  md3LabelLargeClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';

// ─── Task / Priority helpers ──────────────────────────────────────────────────

const priorityConfig = {
  low:    { label: 'Baja',   cls: 'bg-surface-container text-on-surface-variant' },
  medium: { label: 'Media',  cls: 'bg-secondary-container text-on-secondary-container' },
  high:   { label: 'Alta',   cls: 'bg-error-container text-on-error-container' },
};

const statusConfig = {
  pending:     { label: 'Pendiente',   cls: 'bg-surface-container text-on-surface-variant' },
  in_progress: { label: 'En progreso', cls: 'bg-primary-container text-on-primary-container' },
  done:        { label: 'Completada',  cls: 'bg-tertiary-container text-on-tertiary-container' },
  cancelled:   { label: 'Cancelada',   cls: 'bg-error-container/50 text-on-error-container' },
};

const getInitials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

// ─── Module metadata ──────────────────────────────────────────────────────────

const MODULE_META: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  clients: {
    label: 'Miembros',
    description: 'Registro y consulta de clientes o socios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  payments: {
    label: 'Pagos',
    description: 'Registro y seguimiento de pagos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  attendance: {
    label: 'Asistencia',
    description: 'Control de entradas, salidas y horarios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  reports: {
    label: 'Reportes',
    description: 'Estadísticas e informes del negocio',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
};

const getModuleLabel = (key: string) => MODULE_META[key]?.label ?? key;

// ─── Permission presets ───────────────────────────────────────────────────────
// Instead of raw checkboxes, give admins four meaningful levels per module.

const PERMISSION_PRESETS = [
  {
    key: 'view_only',
    label: 'Solo ver',
    description: 'Puede consultar los registros, sin modificar nada',
    perms: ['view'],
  },
  {
    key: 'operator',
    label: 'Ver y registrar',
    description: 'Puede consultar y agregar nuevos registros',
    perms: ['view', 'create'],
  },
  {
    key: 'editor',
    label: 'Ver, registrar y editar',
    description: 'Puede ver, agregar y modificar registros existentes',
    perms: ['view', 'create', 'edit'],
  },
  {
    key: 'full_access',
    label: 'Acceso total',
    description: 'Control completo, incluyendo eliminar y desactivar',
    perms: ['view', 'create', 'edit', 'delete'],
  },
] as const;

type PresetKey = (typeof PERMISSION_PRESETS)[number]['key'];

const getPresetKey = (perms: string[]): PresetKey | null => {
  const sorted = [...perms].sort().join(',');
  for (const p of PERMISSION_PRESETS) {
    if ([...p.perms].sort().join(',') === sorted) return p.key;
  }
  return null;
};

// ─── Shared: permission section ───────────────────────────────────────────────

const ModulePermissionsSection = ({
  modules,
  allowedModules,
  modulePermissions,
  onToggleModule,
  onSetPermissions,
}: {
  modules: string[];
  allowedModules: string[];
  modulePermissions: Record<string, string[]>;
  onToggleModule: (key: string) => void;
  onSetPermissions: (key: string, perms: string[]) => void;
}) => {
  if (modules.length === 0) return null;
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-sm font-semibold text-on-surface">Acceso al sistema</p>
      </div>
      <p className="mb-4 text-xs text-on-surface-variant">
        Activa las secciones a las que tendrá acceso y define qué puede hacer en cada una.
      </p>
      <div className="space-y-3">
        {modules.filter((m) => m !== 'workers').map((key) => {
          const active = allowedModules.includes(key);
          const currentPerms = modulePermissions[key] ?? [];
          const presetKey = getPresetKey(currentPerms);
          const meta = MODULE_META[key];

          return (
            <div
              key={key}
              className={`overflow-hidden rounded-2xl border transition-colors ${
                active ? 'border-primary' : 'border-outline-variant'
              }`}
            >
              {/* Module header row */}
              <button
                type="button"
                onClick={() => onToggleModule(key)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  active ? 'bg-primary-container/25' : 'hover:bg-on-surface/4'
                }`}
              >
                {/* Toggle indicator */}
                <div className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                  active ? 'bg-primary' : 'bg-outline-variant'
                }`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    active ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
                {/* Icon + labels */}
                <div className={`flex items-center gap-2 flex-1 min-w-0 ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {meta?.icon}
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {meta?.label ?? key}
                    </p>
                    {meta?.description && (
                      <p className="text-xs text-on-surface-variant truncate">{meta.description}</p>
                    )}
                  </div>
                </div>
                {active && (
                  <span className="flex-shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-on-primary">
                    Activo
                  </span>
                )}
              </button>

              {/* Permission level selector — only when module is active */}
              {active && (
                <div className="border-t border-primary/15 bg-surface-container/30 px-4 py-3">
                  <p className="mb-2.5 text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                    ¿Qué puede hacer en esta sección?
                  </p>
                  <div className="space-y-1.5">
                    {PERMISSION_PRESETS.map((preset) => {
                      const selected = presetKey === preset.key;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => onSetPermissions(key, [...preset.perms])}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                            selected
                              ? 'bg-primary-container/60 ring-1 ring-primary/30'
                              : 'hover:bg-on-surface/4'
                          }`}
                        >
                          {/* Radio dot */}
                          <div className={`h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors ${
                            selected ? 'border-primary bg-primary' : 'border-outline-variant'
                          }`}>
                            {selected && <div className="m-auto mt-[3px] h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium leading-tight ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                              {preset.label}
                            </p>
                            <p className="text-xs text-on-surface-variant leading-snug">
                              {preset.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Worker Edit Modal ────────────────────────────────────────────────────────

const WorkerEditModal = ({
  worker,
  orgModules,
  onClose,
}: {
  worker: Worker;
  orgModules: string[];
  onClose: () => void;
}) => {
  const updateWorker = useUpdateWorker();
  const [form, setForm] = useState<UpdateWorkerPayload>({
    first_name: worker.first_name,
    last_name: worker.last_name,
    email: worker.email,
    phone: worker.phone,
    position: worker.position,
    allowed_modules: (worker.allowed_modules.length > 0 ? worker.allowed_modules : [...orgModules])
      .filter((m) => m !== 'workers'),
    module_permissions: worker.module_permissions ?? {},
  });

  const toggleModule = (key: string) => {
    setForm((prev) => {
      const mods = prev.allowed_modules ?? [];
      const isActive = mods.includes(key);
      const newMods = isActive ? mods.filter((m) => m !== key) : [...mods, key];
      const newPerms = { ...(prev.module_permissions ?? {}) };
      if (isActive) {
        delete newPerms[key];
      } else if (!newPerms[key]?.length) {
        newPerms[key] = ['view'];
      }
      return { ...prev, allowed_modules: newMods, module_permissions: newPerms };
    });
  };

  const setModulePerms = (moduleKey: string, perms: string[]) => {
    setForm((prev) => ({
      ...prev,
      module_permissions: { ...(prev.module_permissions ?? {}), [moduleKey]: perms },
    }));
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    await updateWorker.mutateAsync({ id: worker.id, payload: form });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`${md3SurfaceClass} w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl`}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-outline-variant/40 bg-inherit px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
              {getInitials(worker.full_name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">{worker.full_name}</p>
              <p className="text-xs text-on-surface-variant">{worker.position}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información personal */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <p className="text-sm font-semibold text-on-surface">Información personal</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={md3InputLabelClass}>Nombre *</label>
                <input required className={md3TextFieldClass} value={form.first_name}
                  onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <label className={md3InputLabelClass}>Apellido *</label>
                <input required className={md3TextFieldClass} value={form.last_name}
                  onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
              <div>
                <label className={md3InputLabelClass}>Correo electrónico</label>
                <input type="email" className={md3TextFieldClass} value={form.email ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className={md3InputLabelClass}>Teléfono *</label>
                <input required className={md3TextFieldClass} value={form.phone ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className={md3InputLabelClass}>Cargo *</label>
                <input required className={md3TextFieldClass} value={form.position ?? ''}
                  placeholder="Ej: Barbero, Cajero, Recepcionista..."
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Permisos */}
          {orgModules.length > 0 && (
            <ModulePermissionsSection
              modules={orgModules}
              allowedModules={form.allowed_modules ?? []}
              modulePermissions={form.module_permissions ?? {}}
              onToggleModule={toggleModule}
              onSetPermissions={setModulePerms}
            />
          )}

          {updateWorker.isError && (
            <div className="rounded-xl bg-error-container/50 px-4 py-3 text-sm text-on-error-container">
              Ocurrió un error al guardar. Inténtalo de nuevo.
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" className={`${md3FilledButtonClass} flex-1`}
              disabled={updateWorker.isPending}>
              {updateWorker.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Credentials Modal ────────────────────────────────────────────────────────

const CredentialsModal = ({
  credentials,
  workerName,
  onClose,
}: {
  credentials: GeneratedCredentials;
  workerName: string;
  onClose: () => void;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);

  const copy = async (text: string, field: 'username' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`${md3SurfaceClass} w-full max-w-md p-6 shadow-2xl`}>
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-on-primary-container">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h3 className={md3TitleMediumClass}>Credenciales generadas</h3>
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{workerName}</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-outline-variant bg-surface-container-high p-3">
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
            Guarda estas credenciales ahora — no se volverán a mostrar.
          </p>
        </div>

        <div className="mb-3">
          <label className={md3InputLabelClass}>Usuario para iniciar sesión</label>
          <div className="mt-1 flex gap-2">
            <input readOnly value={credentials.username}
              className={`${md3TextFieldClass} flex-1 bg-surface-container-low font-mono text-sm`} />
            <button type="button" onClick={() => copy(credentials.username, 'username')}
              className={`flex-shrink-0 rounded-xl border border-outline-variant px-3 py-2 text-sm font-medium transition hover:bg-on-surface/8 ${
                copied === 'username' ? 'text-primary' : 'text-on-surface-variant'
              }`}>
              {copied === 'username' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="mb-5">
          <label className={md3InputLabelClass}>Contraseña</label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <input readOnly type={showPassword ? 'text' : 'password'} value={credentials.password}
                className={`${md3TextFieldClass} w-full bg-surface-container-low font-mono text-sm pr-10`} />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                {showPassword
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                }
              </button>
            </div>
            <button type="button" onClick={() => copy(credentials.password, 'password')}
              className={`flex-shrink-0 rounded-xl border border-outline-variant px-3 py-2 text-sm font-medium transition hover:bg-on-surface/8 ${
                copied === 'password' ? 'text-primary' : 'text-on-surface-variant'
              }`}>
              {copied === 'password' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <button type="button" onClick={onClose} className={`${md3FilledButtonClass} w-full`}>
          Entendido, ya guardé las credenciales
        </button>
      </div>
    </div>
  );
};

// ─── Worker Form Modal ────────────────────────────────────────────────────────

const WorkerFormModal = ({
  orgModules,
  onCredentials,
  onClose,
}: {
  orgModules: string[];
  onCredentials: (creds: GeneratedCredentials, workerName: string) => void;
  onClose: () => void;
}) => {
  const createWorker = useCreateWorker();
  const selectableModules = orgModules.filter((m) => m !== 'workers');

  const defaultPermissions: Record<string, string[]> = {};
  selectableModules.forEach((key) => { defaultPermissions[key] = ['view']; });

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    allowed_modules: [...selectableModules],
    module_permissions: defaultPermissions as Record<string, string[]>,
    create_account: false,
    credential_type: 'gmail' as 'gmail' | 'auto',
    password_type: 'manual' as 'manual' | 'auto',
    password: '',
  });

  const toggleModule = (key: string) => {
    setForm((prev) => {
      const isActive = prev.allowed_modules.includes(key);
      const newMods = isActive ? prev.allowed_modules.filter((m) => m !== key) : [...prev.allowed_modules, key];
      const newPerms = { ...prev.module_permissions };
      if (isActive) { delete newPerms[key]; }
      else if (!newPerms[key]?.length) { newPerms[key] = ['view']; }
      return { ...prev, allowed_modules: newMods, module_permissions: newPerms };
    });
  };

  const setModulePerms = (moduleKey: string, perms: string[]) => {
    setForm((prev) => ({
      ...prev,
      module_permissions: { ...prev.module_permissions, [moduleKey]: perms },
    }));
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try {
      const result = await createWorker.mutateAsync(form);
      if (result.generated_credentials) {
        onCredentials(result.generated_credentials, result.full_name);
      } else {
        onClose();
      }
    } catch { /* error shown below */ }
  };

  const showEmailField = form.credential_type === 'gmail' || !form.create_account;
  const showPasswordField = form.create_account && form.credential_type === 'gmail' && form.password_type === 'manual';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`${md3SurfaceClass} w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl`}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-outline-variant/40 bg-inherit px-6 py-4">
          <div>
            <p className="text-base font-semibold text-on-surface">Agregar trabajador</p>
            <p className="text-xs text-on-surface-variant">Completa los datos del nuevo integrante del equipo</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {createWorker.isError && (
            <div className="rounded-xl bg-error-container/50 px-4 py-3 text-sm text-on-error-container">
              No se pudo crear el trabajador. Verifica que el correo no esté registrado.
            </div>
          )}

          {/* Datos personales */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <p className="text-sm font-semibold text-on-surface">Datos personales</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={md3InputLabelClass}>Nombre *</label>
                <input required className={md3TextFieldClass} value={form.first_name}
                  onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <label className={md3InputLabelClass}>Apellido *</label>
                <input required className={md3TextFieldClass} value={form.last_name}
                  onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
              {showEmailField && (
                <div>
                  <label className={md3InputLabelClass}>
                    Correo electrónico {form.create_account && form.credential_type === 'gmail' ? '*' : ''}
                  </label>
                  <input type="email" className={md3TextFieldClass} value={form.email}
                    required={form.create_account && form.credential_type === 'gmail'}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              )}
              <div>
                <label className={md3InputLabelClass}>Teléfono *</label>
                <input required className={md3TextFieldClass} value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className={showEmailField ? '' : 'sm:col-span-2'}>
                <label className={md3InputLabelClass}>Cargo *</label>
                <input required className={md3TextFieldClass} value={form.position}
                  placeholder="Ej: Barbero, Cajero, Recepcionista..."
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Cuenta de acceso */}
          <div className="rounded-2xl border border-outline-variant overflow-hidden">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, create_account: !p.create_account }))}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                form.create_account ? 'bg-primary-container/25' : 'hover:bg-on-surface/4'
              }`}
            >
              <div className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                form.create_account ? 'bg-primary' : 'bg-outline-variant'
              }`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  form.create_account ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">Crear cuenta de acceso al sistema</p>
                <p className="text-xs text-on-surface-variant">El trabajador podrá iniciar sesión con usuario y contraseña</p>
              </div>
            </button>

            {form.create_account && (
              <div className="border-t border-outline-variant/50 px-4 py-4 space-y-4">
                {/* Tipo de credencial */}
                <div>
                  <p className="mb-2 text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                    ¿Cómo iniciará sesión?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button"
                      onClick={() => setForm((p) => ({ ...p, credential_type: 'gmail' }))}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        form.credential_type === 'gmail'
                          ? 'border-primary bg-primary-container/30'
                          : 'border-outline-variant hover:bg-on-surface/4'
                      }`}>
                      <p className="text-sm font-semibold text-on-surface">Con su correo</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Usa su email como usuario</p>
                    </button>
                    <button type="button"
                      onClick={() => setForm((p) => ({ ...p, credential_type: 'auto', password_type: 'auto' }))}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        form.credential_type === 'auto'
                          ? 'border-primary bg-primary-container/30'
                          : 'border-outline-variant hover:bg-on-surface/4'
                      }`}>
                      <p className="text-sm font-semibold text-on-surface">Usuario generado</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">El sistema crea usuario y contraseña</p>
                    </button>
                  </div>
                </div>

                {/* Contraseña (solo correo) */}
                {form.credential_type === 'gmail' && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                      Contraseña inicial
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button"
                        onClick={() => setForm((p) => ({ ...p, password_type: 'manual' }))}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          form.password_type === 'manual'
                            ? 'border-primary bg-primary-container/30'
                            : 'border-outline-variant hover:bg-on-surface/4'
                        }`}>
                        <p className="text-sm font-semibold text-on-surface">La defino yo</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">Escribes la contraseña ahora</p>
                      </button>
                      <button type="button"
                        onClick={() => setForm((p) => ({ ...p, password_type: 'auto', password: '' }))}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          form.password_type === 'auto'
                            ? 'border-primary bg-primary-container/30'
                            : 'border-outline-variant hover:bg-on-surface/4'
                        }`}>
                        <p className="text-sm font-semibold text-on-surface">Generarla automáticamente</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">El sistema crea una segura</p>
                      </button>
                    </div>
                  </div>
                )}

                {showPasswordField && (
                  <div>
                    <label className={md3InputLabelClass}>Contraseña inicial *</label>
                    <input type="password" required minLength={8} className={md3TextFieldClass}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                    <p className="mt-1 text-xs text-on-surface-variant">Mínimo 8 caracteres.</p>
                  </div>
                )}

                {(form.credential_type === 'auto' || form.password_type === 'auto') && (
                  <div className="flex items-start gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0 text-on-surface-variant">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-xs text-on-surface-variant">
                      Las credenciales se mostrarán al guardar. Asegúrate de anotarlas.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Acceso al sistema */}
          {selectableModules.length > 0 && (
            <ModulePermissionsSection
              modules={selectableModules}
              allowedModules={form.allowed_modules}
              modulePermissions={form.module_permissions}
              onToggleModule={toggleModule}
              onSetPermissions={setModulePerms}
            />
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" className={`${md3FilledButtonClass} flex-1`} disabled={createWorker.isPending}>
              {createWorker.isPending ? 'Guardando...' : 'Agregar trabajador'}
            </button>
            <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Task Form Modal ──────────────────────────────────────────────────────────

const PRIORITY_META = {
  low:    { label: 'Baja',  description: 'Sin urgencia, puede esperar',    dot: 'bg-on-surface-variant' },
  medium: { label: 'Media', description: 'Atender en el día o próximos días', dot: 'bg-secondary' },
  high:   { label: 'Alta',  description: 'Requiere atención inmediata',    dot: 'bg-error' },
} as const;

const TaskFormModal = ({
  workers,
  workerId,
  onClose,
}: {
  workers: Worker[];
  workerId?: number;
  onClose: () => void;
}) => {
  const createTask = useCreateTask();
  const [form, setForm] = useState<CreateTaskPayload>({
    worker_id: workerId ?? null,
    title: '',
    description: '',
    due_date: null,
    priority: 'medium',
  });

  const assignedWorker = workers.find((w) => w.id === form.worker_id);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try { await createTask.mutateAsync(form); onClose(); } catch { /* error below */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`${md3SurfaceClass} w-full max-w-md shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-outline-variant/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-secondary-container">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-on-surface">Nueva tarea</p>
              <p className="text-xs text-on-surface-variant">
                {assignedWorker ? `Para ${assignedWorker.full_name}` : 'Sin asignar aún'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {createTask.isError && (
            <div className="rounded-xl bg-error-container/50 px-4 py-3 text-sm text-on-error-container">
              Ocurrió un error al crear la tarea. Inténtalo de nuevo.
            </div>
          )}

          {/* Título */}
          <div>
            <label className={md3InputLabelClass}>¿Qué hay que hacer? *</label>
            <input
              required
              autoFocus
              placeholder="Ej: Llamar al proveedor, Limpiar área, Revisar caja..."
              className={md3TextFieldClass}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className={md3InputLabelClass}>Detalles adicionales</label>
            <textarea
              rows={3}
              placeholder="Instrucciones, contexto o notas relevantes..."
              className={`${md3TextFieldClass} h-auto py-3 resize-none`}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Asignar a trabajador */}
          <div>
            <label className={md3InputLabelClass}>Asignar a</label>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {/* Opción sin asignar */}
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, worker_id: null }))}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                  form.worker_id === null
                    ? 'border-primary bg-primary-container/30'
                    : 'border-outline-variant hover:bg-on-surface/4'
                }`}
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-container text-xs text-on-surface-variant">
                  —
                </div>
                <span className="text-xs font-medium text-on-surface-variant">Sin asignar</span>
              </button>

              {workers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, worker_id: w.id }))}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                    form.worker_id === w.id
                      ? 'border-primary bg-primary-container/30'
                      : 'border-outline-variant hover:bg-on-surface/4'
                  }`}
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
                    {getInitials(w.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-on-surface leading-tight">{w.first_name}</p>
                    {w.position && <p className="truncate text-[10px] text-on-surface-variant leading-tight">{w.position}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Fecha límite */}
            <div>
              <label className={md3InputLabelClass}>Fecha límite</label>
              <input
                type="date"
                className={md3TextFieldClass}
                value={form.due_date ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value || null }))}
              />
            </div>

            {/* Prioridad */}
            <div>
              <label className={md3InputLabelClass}>Prioridad</label>
              <div className="mt-1 space-y-1.5">
                {(['low', 'medium', 'high'] as const).map((p) => {
                  const meta = PRIORITY_META[p];
                  const selected = form.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
                        selected
                          ? 'border-primary bg-primary-container/30'
                          : 'border-outline-variant hover:bg-on-surface/4'
                      }`}
                    >
                      <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${meta.dot}`} />
                      <div>
                        <p className={`text-xs font-semibold leading-tight ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                          {meta.label}
                        </p>
                        <p className="text-[10px] text-on-surface-variant leading-tight">{meta.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" className={`${md3FilledButtonClass} flex-1`} disabled={createTask.isPending}>
              {createTask.isPending ? 'Guardando...' : 'Crear tarea'}
            </button>
            <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Task Card ────────────────────────────────────────────────────────────────

const TaskCard = ({ task }: { task: Task }) => {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const nextStatus: Record<Task['status'], Task['status']> = {
    pending: 'in_progress', in_progress: 'done', done: 'pending', cancelled: 'pending',
  };

  return (
    <div className={`${md3CardClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`font-medium text-on-surface ${md3TitleMediumClass}`}>{task.title}</p>
          {task.description && (
            <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>{task.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig[task.status].cls}`}>
              {statusConfig[task.status].label}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityConfig[task.priority].cls}`}>
              {priorityConfig[task.priority].label}
            </span>
            {task.due_date && (
              <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                Límite: {new Date(task.due_date).toLocaleDateString('es')}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-1">
          {task.status !== 'done' && task.status !== 'cancelled' && (
            <button type="button"
              onClick={() => updateTask.mutate({ id: task.id, payload: { status: nextStatus[task.status] } })}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/8 transition">
              {task.status === 'pending' ? 'Iniciar' : 'Completar'}
            </button>
          )}
          <button type="button" onClick={() => deleteTask.mutate(task.id)}
            className="rounded-full px-2 py-1.5 text-xs font-medium text-error hover:bg-error/8 transition">✕</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const WorkersPage = () => {
  const { data: workers = [], isLoading: loadingWorkers } = useWorkers();
  const { data: allTasks = [] } = useTasks();
  const deleteWorker = useDeleteWorker();
  const organization = useOrgStore((state) => state.organization);
  const role = useOrgStore((state) => state.role);
  const orgModules = organization?.enabled_modules ?? [];
  const isAdmin = role === 'admin' || role === 'manager';

  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{
    credentials: GeneratedCredentials;
    workerName: string;
  } | null>(null);

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);
  const workerTasks = allTasks.filter((t) =>
    selectedWorkerId ? t.worker_id === selectedWorkerId : true
  );

  const handleWorkerCredentials = (creds: GeneratedCredentials, workerName: string) => {
    setShowWorkerForm(false);
    setCredentialsModal({ credentials: creds, workerName });
  };

  return (
    <div className="space-y-6">
      {/* Modales */}
      {showWorkerForm && (
        <WorkerFormModal
          orgModules={orgModules}
          onCredentials={handleWorkerCredentials}
          onClose={() => setShowWorkerForm(false)}
        />
      )}
      {showTaskForm && (
        <TaskFormModal
          workers={workers}
          workerId={selectedWorkerId ?? undefined}
          onClose={() => setShowTaskForm(false)}
        />
      )}
      {editingWorker && (
        <WorkerEditModal
          worker={editingWorker}
          orgModules={orgModules}
          onClose={() => setEditingWorker(null)}
        />
      )}
      {credentialsModal && (
        <CredentialsModal
          credentials={credentialsModal.credentials}
          workerName={credentialsModal.workerName}
          onClose={() => setCredentialsModal(null)}
        />
      )}

      {/* Header */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className={md3OverlineClass}>Gestión de equipo</span>
            <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Trabajadores</h1>
            <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
              {workers.length} trabajador{workers.length !== 1 ? 'es' : ''} · {allTasks.filter((t) => t.status === 'pending').length} tareas pendientes
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => { setShowTaskForm(true); setSelectedWorkerId(null); }}
                className={md3OutlinedButtonClass}>
                + Nueva tarea
              </button>
              <button onClick={() => setShowWorkerForm(true)} className={md3FilledButtonClass}>
                + Trabajador
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Lista de trabajadores */}
        <section>
          <h2 className={`mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant`}>
            Equipo ({workers.length})
          </h2>

          {loadingWorkers ? (
            <div className="flex justify-center py-10">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            </div>
          ) : workers.length === 0 ? (
            <div className={`${md3SurfaceClass} p-8 text-center`}>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-on-surface-variant">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className={`font-medium text-on-surface ${md3BodyMediumClass}`}>Sin trabajadores aún</p>
              {isAdmin && (
                <button onClick={() => setShowWorkerForm(true)}
                  className="mt-3 text-sm font-medium text-primary hover:underline">
                  Agregar el primero
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Filtro "Todas las tareas" */}
              <button
                type="button"
                onClick={() => setSelectedWorkerId(null)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                  selectedWorkerId === null
                    ? 'border-primary bg-primary-container/30'
                    : 'border-outline-variant hover:bg-on-surface/4'
                }`}>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-sm font-semibold text-on-secondary-container">
                  ≡
                </div>
                <div>
                  <p className={`font-medium text-on-surface ${md3LabelLargeClass}`}>Todas las tareas</p>
                  <p className={`text-on-surface-variant text-xs`}>{allTasks.length} tareas en total</p>
                </div>
              </button>

              {workers.map((worker) => {
                const visibleModules = (worker.allowed_modules ?? []).filter(m => m !== 'workers');
                const isSelected = selectedWorkerId === worker.id;
                return (
                  <div key={worker.id}
                    className={`overflow-hidden rounded-2xl border transition-colors ${
                      isSelected ? 'border-primary' : 'border-outline-variant'
                    }`}>
                    {/* Fila principal */}
                    <button
                      type="button"
                      onClick={() => { setSelectedWorkerId(worker.id); setConfirmDeleteId(null); }}
                      className={`flex w-full items-center gap-3 p-3.5 text-left transition-colors ${
                        isSelected ? 'bg-primary-container/30' : 'hover:bg-on-surface/4'
                      }`}>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                        {getInitials(worker.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-semibold text-on-surface ${md3LabelLargeClass}`}>
                          {worker.full_name}
                        </p>
                        <p className={`truncate text-on-surface-variant text-xs`}>
                          {worker.position}{worker.task_count > 0 ? ` · ${worker.task_count} tarea${worker.task_count !== 1 ? 's' : ''}` : ''}
                        </p>
                      </div>
                      {worker.has_account && (
                        <span className="flex-shrink-0 rounded-full bg-tertiary-container px-2 py-0.5 text-[10px] font-semibold text-on-tertiary-container">
                          Cuenta
                        </span>
                      )}
                    </button>

                    {/* Módulos habilitados */}
                    {visibleModules.length > 0 && (
                      <div className={`flex flex-wrap gap-1 px-3.5 pb-2 ${isSelected ? 'bg-primary-container/30' : ''}`}>
                        {visibleModules.slice(0, 3).map((m) => (
                          <span key={m}
                            className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                            {getModuleLabel(m)}
                          </span>
                        ))}
                        {visibleModules.length > 3 && (
                          <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] text-on-surface-variant">
                            +{visibleModules.length - 3} más
                          </span>
                        )}
                      </div>
                    )}

                    {/* Acciones (siempre visibles para admin) */}
                    {isAdmin && (
                      <div className={`flex items-center justify-end gap-1 border-t border-outline-variant/20 px-3 py-1.5 ${
                        isSelected ? 'bg-primary-container/20' : 'bg-surface-container/30'
                      }`}>
                        {confirmDeleteId === worker.id ? (
                          <>
                            <span className="mr-auto text-xs text-error">¿Eliminar a {worker.first_name}?</span>
                            <button type="button"
                              onClick={() => { deleteWorker.mutate(worker.id); setConfirmDeleteId(null); }}
                              className="rounded-full px-3 py-1 text-xs font-semibold text-error hover:bg-error/10 transition">
                              Sí, eliminar
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteId(null)}
                              className="rounded-full px-3 py-1 text-xs text-on-surface-variant hover:bg-on-surface/8 transition">
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => setEditingWorker(worker)}
                              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Editar
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteId(worker.id)}
                              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-error hover:bg-error/8 transition">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Panel de tareas */}
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className={`text-xs font-semibold uppercase tracking-wider text-on-surface-variant`}>
              {selectedWorker ? `Tareas — ${selectedWorker.full_name}` : 'Todas las tareas'}
            </h2>
            {isAdmin && (
              <button type="button" onClick={() => setShowTaskForm(true)}
                className="text-sm font-medium text-primary hover:underline">
                + Nueva tarea
              </button>
            )}
          </div>

          {workerTasks.length === 0 ? (
            <div className={`${md3SurfaceClass} p-8 text-center`}>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-on-surface-variant">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                No hay tareas {selectedWorker ? `para ${selectedWorker.first_name}` : 'registradas'}.
              </p>
              {isAdmin && (
                <button onClick={() => setShowTaskForm(true)}
                  className="mt-3 text-sm font-medium text-primary hover:underline">
                  Crear la primera tarea
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {workerTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
