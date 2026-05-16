import { useState } from 'react';

import {
  useCreateTask,
  useCreateWorker,
  useDeleteTask,
  useDeleteWorker,
  useTasks,
  useUpdateTask,
  useWorkers,
} from '../hooks/useWorkers';
import type { CreateTaskPayload, CreateWorkerPayload, Task, Worker } from '../types';
import {
  md3BodyMediumClass,
  md3CardClass,
  md3DestructiveButtonClass,
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

const getInitials = (name: string) => name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

// ─── Worker Form ──────────────────────────────────────────────────────────────

const WorkerForm = ({ onClose }: { onClose: () => void }) => {
  const createWorker = useCreateWorker();
  const [form, setForm] = useState<CreateWorkerPayload>({
    first_name: '', last_name: '', email: '', phone: '', position: '',
    create_account: false, password: '',
  });

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try {
      await createWorker.mutateAsync(form);
      onClose();
    } catch { /* error shown below */ }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className={md3InputLabelClass}>Teléfono</label>
          <input className={md3TextFieldClass} value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className={md3InputLabelClass}>Cargo / Posición</label>
          <input className={md3TextFieldClass} value={form.position} placeholder="Barbero, Cajero, Maestro..."
            onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} />
        </div>
      </div>

      <label className={`flex cursor-pointer items-center gap-3 ${md3BodyMediumClass}`}>
        <input type="checkbox" checked={form.create_account}
          onChange={(e) => setForm((p) => ({ ...p, create_account: e.target.checked }))}
          className="h-4 w-4 rounded border-outline text-primary" />
        Crear cuenta en el sistema para este trabajador
      </label>

      {form.create_account && (
        <div>
          <label className={md3InputLabelClass}>Contraseña inicial</label>
          <input type="password" required minLength={8} className={md3TextFieldClass}
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
            Mínimo 8 caracteres. El trabajador podrá cambiarla al iniciar sesión.
          </p>
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

const TaskForm = ({ workers, workerId, onClose }: { workers: Worker[]; workerId?: number; onClose: () => void }) => {
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
        <select className={`${md3TextFieldClass} appearance-none`}
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

  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);
  const workerTasks = allTasks.filter((t) =>
    selectedWorkerId ? t.worker_id === selectedWorkerId : true
  );
  const unassignedTasks = allTasks.filter((t) => t.worker_id === null);

  return (
    <div className="space-y-6">
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
          <div className="flex gap-2">
            <button onClick={() => { setShowTaskForm(true); setSelectedWorkerId(null); }}
              className={md3OutlinedButtonClass}>
              + Tarea
            </button>
            <button onClick={() => setShowWorkerForm(true)} className={md3FilledButtonClass}>
              + Trabajador
            </button>
          </div>
        </div>
      </section>

      {/* Formularios */}
      {showWorkerForm && (
        <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
          <h2 className={`mb-4 ${md3TitleMediumClass}`}>Nuevo trabajador</h2>
          <WorkerForm onClose={() => setShowWorkerForm(false)} />
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
              {/* Opción "Todos" */}
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
                  className={`group relative rounded-[16px] border transition ${
                    selectedWorkerId === worker.id
                      ? 'border-primary bg-primary-container/30'
                      : 'border-outline-variant hover:bg-on-surface/4'
                  }`}>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className="flex w-full items-center gap-3 p-4 text-left">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                      {getInitials(worker.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-medium text-on-surface ${md3LabelLargeClass}`}>{worker.full_name}</p>
                      <p className={`truncate text-on-surface-variant ${md3BodyMediumClass}`}>
                        {worker.position || 'Sin cargo'} · {worker.task_count} tarea{worker.task_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {worker.has_account && (
                      <span className="flex-shrink-0 rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-semibold text-on-primary-container">
                        Cuenta
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteWorker.mutate(worker.id)}
                    className="absolute right-2 top-2 hidden rounded-full p-1.5 text-error hover:bg-error/8 group-hover:block">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
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
            <button
              type="button"
              onClick={() => setShowTaskForm(true)}
              className="text-sm font-medium text-primary hover:underline">
              + Nueva tarea
            </button>
          </div>

          {workerTasks.length === 0 && unassignedTasks.length === 0 ? (
            <div className={`${md3SurfaceClass} p-8 text-center`}>
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                No hay tareas {selectedWorker ? `para ${selectedWorker.first_name}` : 'registradas'}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(selectedWorkerId ? workerTasks : allTasks).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
