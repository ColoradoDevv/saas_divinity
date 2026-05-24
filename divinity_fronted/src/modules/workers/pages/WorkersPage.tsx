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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const priorityConfig = {
  low: { label: 'Baja', cls: 'bg-surface-container text-on-surface-variant' },
  medium: { label: 'Media', cls: 'bg-secondary-container text-on-secondary-container' },
  high: { label: 'Alta', cls: 'bg-error-container text-on-error-container' },
};

const statusConfig = {
  pending: { label: 'Pendiente', cls: 'bg-surface-container text-on-surface-variant' },
  in_progress: { label: 'En progreso', cls: 'bg-primary-container text-on-primary-container' },
  done: { label: 'Completada', cls: 'bg-tertiary-container text-on-tertiary-container' },
  cancelled: { label: 'Cancelada', cls: 'bg-error-container/50 text-on-error-container' },
};

const getInitials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

// ─── Module labels ────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  clients: 'Miembros',
  workers: 'Trabajadores',
  payments: 'Pagos',
  attendance: 'Asistencia',
  reports: 'Reportes',
};

const MODULE_ACTIONS = [
  { key: 'view',   label: 'Ver' },
  { key: 'create', label: 'Crear' },
  { key: 'edit',   label: 'Editar' },
  { key: 'delete', label: 'Eliminar' },
];

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

  const togglePermission = (moduleKey: string, action: string) => {
    setForm((prev) => {
      const perms = { ...(prev.module_permissions ?? {}) };
      const current = perms[moduleKey] ?? [];
      perms[moduleKey] = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, module_permissions: perms };
    });
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    await updateWorker.mutateAsync({ id: worker.id, payload: form });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`${md3SurfaceClass} w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className={md3TitleMediumClass}>Editar trabajador</h3>
              <p className={`mt-0.5 text-on-surface-variant ${md3BodyMediumClass}`}>{worker.full_name}</p>
            </div>
            <button type="button" onClick={onClose}
              className="flex-shrink-0 rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Datos personales */}
            <div className="grid gap-4 sm:grid-cols-2">
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
                <input type="email" className={md3TextFieldClass} value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className={md3InputLabelClass}>Teléfono *</label>
                <input required className={md3TextFieldClass} value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className={md3InputLabelClass}>Cargo / Posición *</label>
                <input required className={md3TextFieldClass} value={form.position}
                  placeholder="Barbero, Cajero, Maestro..."
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} />
              </div>
            </div>

            {/* Módulos y permisos */}
            {orgModules.length > 0 && (
              <div>
                <p className={`mb-2 ${md3InputLabelClass}`}>Módulos y permisos</p>
                <p className={`mb-3 text-on-surface-variant ${md3BodyMediumClass}`}>
                  Activa los módulos y elige qué acciones puede realizar en cada uno.
                </p>
                <div className="space-y-2">
                  {orgModules.filter((m) => m !== 'workers').map((key) => {
                    const active = (form.allowed_modules ?? []).includes(key);
                    const activePerms = (form.module_permissions ?? {})[key] ?? [];
                    return (
                      <div key={key} className={`overflow-hidden rounded-[12px] border transition ${
                        active ? 'border-primary' : 'border-outline-variant'
                      }`}>
                        <button
                          type="button"
                          onClick={() => toggleModule(key)}
                          className={`flex w-full items-center gap-3 p-3 text-left transition ${
                            active ? 'bg-primary-container/30' : 'hover:bg-on-surface/4'
                          }`}>
                          <div className={`h-4 w-4 flex-shrink-0 rounded-full border-2 transition ${
                            active ? 'border-primary bg-primary' : 'border-outline-variant'
                          }`}>
                            {active && (
                              <svg viewBox="0 0 16 16" fill="white" className="h-full w-full p-0.5">
                                <path fillRule="evenodd" d="M13.566 3.734a.8.8 0 010 1.132l-6.4 6.4a.8.8 0 01-1.132 0l-3.2-3.2a.8.8 0 111.132-1.132L6.6 9.568l5.834-5.834a.8.8 0 011.132 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                            {MODULE_LABELS[key] ?? key}
                          </span>
                        </button>
                        {active && (
                          <div className="flex flex-wrap gap-2 border-t border-primary/20 bg-surface-container/30 px-3 py-2.5">
                            {MODULE_ACTIONS.map(({ key: action, label }) => {
                              const checked = activePerms.includes(action);
                              return (
                                <label key={action} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition select-none ${
                                  checked
                                    ? 'border-primary bg-primary-container/40 text-on-surface'
                                    : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/4'
                                }`}>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    onChange={() => togglePermission(key, action)}
                                  />
                                  {label}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {updateWorker.isError && (
              <p className={`text-error ${md3BodyMediumClass}`}>
                Error al actualizar. Intenta de nuevo.
              </p>
            )}

            <div className="flex gap-3 pt-2">
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
        {/* Header */}
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-on-primary-container">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h3 className={md3TitleMediumClass}>Credenciales generadas</h3>
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{workerName}</p>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-4 rounded-[12px] border border-outline-variant bg-surface-container-high p-3">
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
            Guarda estas credenciales ahora. No se volverán a mostrar.
          </p>
        </div>

        {/* Username */}
        <div className="mb-3">
          <label className={md3InputLabelClass}>Usuario (para iniciar sesión)</label>
          <div className="mt-1 flex gap-2">
            <input
              readOnly
              value={credentials.username}
              className={`${md3TextFieldClass} flex-1 bg-surface-container-low font-mono text-sm`}
            />
            <button
              type="button"
              onClick={() => copy(credentials.username, 'username')}
              className={`flex-shrink-0 rounded-[12px] border border-outline-variant px-3 py-2 text-sm font-medium transition hover:bg-on-surface/8 ${
                copied === 'username' ? 'text-primary' : 'text-on-surface-variant'
              }`}>
              {copied === 'username' ? '✓' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="mb-5">
          <label className={md3InputLabelClass}>Contraseña</label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <input
                readOnly
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                className={`${md3TextFieldClass} w-full bg-surface-container-low font-mono text-sm pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => copy(credentials.password, 'password')}
              className={`flex-shrink-0 rounded-[12px] border border-outline-variant px-3 py-2 text-sm font-medium transition hover:bg-on-surface/8 ${
                copied === 'password' ? 'text-primary' : 'text-on-surface-variant'
              }`}>
              {copied === 'password' ? '✓' : 'Copiar'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`${md3FilledButtonClass} w-full`}>
          Entendido, ya guardé las credenciales
        </button>
      </div>
    </div>
  );
};

// ─── Worker Form ──────────────────────────────────────────────────────────────

const WorkerForm = ({
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
      const newMods = isActive
        ? prev.allowed_modules.filter((m) => m !== key)
        : [...prev.allowed_modules, key];
      const newPerms = { ...prev.module_permissions };
      if (isActive) {
        delete newPerms[key];
      } else if (!newPerms[key]?.length) {
        newPerms[key] = ['view'];
      }
      return { ...prev, allowed_modules: newMods, module_permissions: newPerms };
    });
  };

  const togglePermission = (moduleKey: string, action: string) => {
    setForm((prev) => {
      const perms = { ...prev.module_permissions };
      const current = perms[moduleKey] ?? [];
      perms[moduleKey] = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, module_permissions: perms };
    });
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
  const showPasswordField =
    form.create_account &&
    form.credential_type === 'gmail' &&
    form.password_type === 'manual';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {createWorker.isError && (
        <div className="rounded-[12px] bg-error-container/50 p-3 text-on-error-container text-sm">
          Error al crear trabajador. Verifica que el correo no esté en uso.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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
            <input
              type="email"
              className={md3TextFieldClass}
              value={form.email}
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
          <label className={md3InputLabelClass}>Cargo / Posición *</label>
          <input required className={md3TextFieldClass} value={form.position}
            placeholder="Barbero, Cajero, Maestro..."
            onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} />
        </div>
      </div>

      {/* Cuenta del sistema */}
      <div className="rounded-[16px] border border-outline-variant p-4 space-y-4">
        <label className={`flex cursor-pointer items-center gap-3 ${md3BodyMediumClass}`}>
          <input
            type="checkbox"
            checked={form.create_account}
            onChange={(e) => setForm((p) => ({ ...p, create_account: e.target.checked }))}
            className="h-4 w-4 rounded border-outline text-primary" />
          <span className="font-medium text-on-surface">Crear cuenta en el sistema para este trabajador</span>
        </label>

        {form.create_account && (
          <div className="space-y-4 border-t border-outline-variant pt-4">
            {/* Tipo de usuario */}
            <div>
              <p className={`mb-2 ${md3InputLabelClass}`}>Tipo de usuario</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, credential_type: 'gmail' }))}
                  className={`rounded-[12px] border p-3 text-left transition ${
                    form.credential_type === 'gmail'
                      ? 'border-primary bg-primary-container/30'
                      : 'border-outline-variant hover:bg-on-surface/4'
                  }`}>
                  <p className={`font-medium text-on-surface ${md3BodyMediumClass}`}>Gmail / Correo</p>
                  <p className={`text-on-surface-variant text-xs`}>El correo es el usuario</p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, credential_type: 'auto', password_type: 'auto' }))}
                  className={`rounded-[12px] border p-3 text-left transition ${
                    form.credential_type === 'auto'
                      ? 'border-primary bg-primary-container/30'
                      : 'border-outline-variant hover:bg-on-surface/4'
                  }`}>
                  <p className={`font-medium text-on-surface ${md3BodyMediumClass}`}>Auto-generado</p>
                  <p className={`text-on-surface-variant text-xs`}>Sistema genera usuario y contraseña</p>
                </button>
              </div>
            </div>

            {/* Tipo de contraseña (solo cuando es gmail) */}
            {form.credential_type === 'gmail' && (
              <div>
                <p className={`mb-2 ${md3InputLabelClass}`}>Contraseña</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, password_type: 'manual' }))}
                    className={`rounded-[12px] border p-3 text-left transition ${
                      form.password_type === 'manual'
                        ? 'border-primary bg-primary-container/30'
                        : 'border-outline-variant hover:bg-on-surface/4'
                    }`}>
                    <p className={`font-medium text-on-surface ${md3BodyMediumClass}`}>Yo la defino</p>
                    <p className="text-on-surface-variant text-xs">Escribes la contraseña</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, password_type: 'auto', password: '' }))}
                    className={`rounded-[12px] border p-3 text-left transition ${
                      form.password_type === 'auto'
                        ? 'border-primary bg-primary-container/30'
                        : 'border-outline-variant hover:bg-on-surface/4'
                    }`}>
                    <p className={`font-medium text-on-surface ${md3BodyMediumClass}`}>Auto-generar</p>
                    <p className="text-on-surface-variant text-xs">Sistema la crea segura</p>
                  </button>
                </div>
              </div>
            )}

            {/* Campo contraseña manual */}
            {showPasswordField && (
              <div>
                <label className={md3InputLabelClass}>Contraseña inicial *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className={md3TextFieldClass}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
                  Mínimo 8 caracteres.
                </p>
              </div>
            )}

            {(form.credential_type === 'auto' || form.password_type === 'auto') && (
              <div className="rounded-[12px] border border-outline-variant bg-surface-container-low p-3">
                <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                  Las credenciales se mostrarán al guardar. Guárdalas en un lugar seguro.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Módulos y permisos */}
      {selectableModules.length > 0 && (
        <div>
          <p className={`mb-2 ${md3InputLabelClass}`}>Módulos y permisos</p>
          <p className={`mb-3 text-on-surface-variant ${md3BodyMediumClass}`}>
            Activa los módulos y elige qué acciones puede realizar en cada uno.
          </p>
          <div className="space-y-2">
            {selectableModules.map((key) => {
              const active = form.allowed_modules.includes(key);
              const activePerms = form.module_permissions[key] ?? [];
              return (
                <div key={key} className={`overflow-hidden rounded-[12px] border transition ${
                  active ? 'border-primary' : 'border-outline-variant'
                }`}>
                  <button
                    type="button"
                    onClick={() => toggleModule(key)}
                    className={`flex w-full items-center gap-3 p-3 text-left transition ${
                      active ? 'bg-primary-container/30' : 'hover:bg-on-surface/4'
                    }`}>
                    <div className={`h-4 w-4 flex-shrink-0 rounded-full border-2 transition ${
                      active ? 'border-primary bg-primary' : 'border-outline-variant'
                    }`}>
                      {active && (
                        <svg viewBox="0 0 16 16" fill="white" className="h-full w-full p-0.5">
                          <path fillRule="evenodd" d="M13.566 3.734a.8.8 0 010 1.132l-6.4 6.4a.8.8 0 01-1.132 0l-3.2-3.2a.8.8 0 111.132-1.132L6.6 9.568l5.834-5.834a.8.8 0 011.132 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {MODULE_LABELS[key] ?? key}
                    </span>
                  </button>
                  {active && (
                    <div className="flex flex-wrap gap-2 border-t border-primary/20 bg-surface-container/30 px-3 py-2.5">
                      {MODULE_ACTIONS.map(({ key: action, label }) => {
                        const checked = activePerms.includes(action);
                        return (
                          <label key={action} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition select-none ${
                            checked
                              ? 'border-primary bg-primary-container/40 text-on-surface'
                              : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/4'
                          }`}>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => togglePermission(key, action)}
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" className={md3FilledButtonClass} disabled={createWorker.isPending}>
          {createWorker.isPending ? 'Guardando...' : 'Agregar trabajador'}
        </button>
        <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>Cancelar</button>
      </div>
    </form>
  );
};

// ─── Task Form ────────────────────────────────────────────────────────────────

const TaskForm = ({
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

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try {
      await createTask.mutateAsync(form);
      onClose();
    } catch { /* error below */ }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={md3InputLabelClass}>Asignar a trabajador</label>
        <select
          className={`${md3TextFieldClass} appearance-none`}
          value={form.worker_id ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, worker_id: e.target.value ? Number(e.target.value) : null }))}>
          <option value="">Sin asignar</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>{w.full_name} {w.position ? `— ${w.position}` : ''}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={md3InputLabelClass}>Título de la tarea *</label>
        <input required className={md3TextFieldClass} value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
      </div>
      <div>
        <label className={md3InputLabelClass}>Descripción</label>
        <textarea rows={3} className={`${md3TextFieldClass} h-auto py-3 resize-none`}
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={md3InputLabelClass}>Fecha límite</label>
          <input type="date" className={md3TextFieldClass}
            value={form.due_date ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value || null }))} />
        </div>
        <div>
          <label className={md3InputLabelClass}>Prioridad</label>
          <div className="mt-1 flex gap-2">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button key={p} type="button"
                onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                className={`flex-1 rounded-full border py-2 text-xs font-semibold capitalize transition ${
                  form.priority === p
                    ? `${priorityConfig[p].cls} border-transparent`
                    : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
                }`}>
                {priorityConfig[p].label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className={md3FilledButtonClass} disabled={createTask.isPending}>
          {createTask.isPending ? 'Guardando...' : 'Crear tarea'}
        </button>
        <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>Cancelar</button>
      </div>
    </form>
  );
};

// ─── Task Card ────────────────────────────────────────────────────────────────

const TaskCard = ({ task }: { task: Task }) => {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const nextStatus: Record<Task['status'], Task['status']> = {
    pending: 'in_progress',
    in_progress: 'done',
    done: 'pending',
    cancelled: 'pending',
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
            <button
              type="button"
              onClick={() => updateTask.mutate({ id: task.id, payload: { status: nextStatus[task.status] } })}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/8 transition">
              {task.status === 'pending' ? 'Iniciar' : 'Completar'}
            </button>
          )}
          <button
            type="button"
            onClick={() => deleteTask.mutate(task.id)}
            className="rounded-full px-2 py-1.5 text-xs font-medium text-error hover:bg-error/8 transition">
            ✕
          </button>
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
              {workers.length} trabajador{workers.length !== 1 ? 'es' : ''} activo{workers.length !== 1 ? 's' : ''} · {allTasks.filter((t) => t.status === 'pending').length} tareas pendientes
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => { setShowTaskForm(true); setSelectedWorkerId(null); }}
                className={md3OutlinedButtonClass}>
                + Tarea
              </button>
              <button onClick={() => setShowWorkerForm(true)} className={md3FilledButtonClass}>
                + Trabajador
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Formularios */}
      {showWorkerForm && (
        <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
          <h2 className={`mb-4 ${md3TitleMediumClass}`}>Nuevo trabajador</h2>
          <WorkerForm
            orgModules={orgModules}
            onCredentials={handleWorkerCredentials}
            onClose={() => setShowWorkerForm(false)}
          />
        </section>
      )}

      {showTaskForm && (
        <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
          <h2 className={`mb-4 ${md3TitleMediumClass}`}>Nueva tarea</h2>
          <TaskForm workers={workers} workerId={selectedWorkerId ?? undefined} onClose={() => setShowTaskForm(false)} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Lista de trabajadores */}
        <section>
          <h2 className={`mb-3 px-1 text-on-surface-variant ${md3BodyMediumClass}`}>Equipo</h2>
          {loadingWorkers ? (
            <div className="flex justify-center py-8">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            </div>
          ) : workers.length === 0 ? (
            <div className={`${md3SurfaceClass} p-6 text-center`}>
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                Aún no hay trabajadores. Crea el primero.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedWorkerId(null)}
                className={`flex w-full items-center gap-3 rounded-[16px] border p-4 text-left transition ${
                  selectedWorkerId === null
                    ? 'border-primary bg-primary-container/30'
                    : 'border-outline-variant hover:bg-on-surface/4'
                }`}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-sm font-semibold text-on-secondary-container">
                  ≡
                </div>
                <div className="min-w-0">
                  <p className={`font-medium text-on-surface ${md3LabelLargeClass}`}>Todas las tareas</p>
                  <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>{allTasks.length} tareas</p>
                </div>
              </button>

              {workers.map((worker) => (
                <div key={worker.id}
                  className={`group overflow-hidden rounded-[16px] border transition ${
                    selectedWorkerId === worker.id
                      ? 'border-primary bg-primary-container/30'
                      : 'border-outline-variant hover:bg-on-surface/4'
                  }`}>
                  {/* Fila principal — selecciona el trabajador */}
                  <button
                    type="button"
                    onClick={() => { setSelectedWorkerId(worker.id); setConfirmDeleteId(null); }}
                    className="flex w-full items-center gap-3 p-4 text-left">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                      {getInitials(worker.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-medium text-on-surface ${md3LabelLargeClass}`}>{worker.full_name}</p>
                      <p className={`truncate text-on-surface-variant ${md3BodyMediumClass}`}>
                        {worker.position} · {worker.task_count} tarea{worker.task_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {worker.has_account && (
                      <span className="flex-shrink-0 rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-semibold text-on-primary-container">
                        Cuenta
                      </span>
                    )}
                  </button>

                  {/* Barra de acciones — solo para admin/manager, visible al hacer hover */}
                  {isAdmin && <div className="hidden group-hover:flex items-center justify-end gap-1 border-t border-outline-variant/20 bg-surface-container/40 px-3 py-1.5">
                    {confirmDeleteId === worker.id ? (
                      <>
                        <span className={`mr-1 text-error ${md3BodyMediumClass}`}>¿Eliminar a {worker.first_name}?</span>
                        <button
                          type="button"
                          onClick={() => { deleteWorker.mutate(worker.id); setConfirmDeleteId(null); }}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-error hover:bg-error/10 transition">
                          Sí, eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-full px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingWorker(worker)}
                          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(worker.id)}
                          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-error hover:bg-error/8 transition">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Panel de tareas */}
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              {selectedWorker ? `Tareas de ${selectedWorker.full_name}` : 'Todas las tareas'}
            </h2>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowTaskForm(true)}
                className="text-sm font-medium text-primary hover:underline">
                + Nueva tarea
              </button>
            )}
          </div>

          {workerTasks.length === 0 ? (
            <div className={`${md3SurfaceClass} p-8 text-center`}>
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                No hay tareas {selectedWorker ? `para ${selectedWorker.first_name}` : 'registradas'}.
              </p>
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
