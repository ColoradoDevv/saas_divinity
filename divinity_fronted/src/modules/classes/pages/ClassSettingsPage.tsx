import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import { useWorkers } from '@/modules/workers/hooks/useWorkers';
import { useToast } from '@/shared/hooks/useToast';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import {
  useClassTypes,
  useCreateClassType,
  useCreateSchedule,
  useDeactivateClassType,
  useDeactivateSchedule,
  useSchedules,
  useUpdateClassType,
} from '../hooks/useClasses';
import type { ClassType, CreateClassTypeData } from '../types';

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// ─── Class type form ──────────────────────────────────────────────────────────

const ClassTypeForm = ({ editing, onDone }: { editing: ClassType | null; onDone: () => void }) => {
  const { data: workers = [] } = useWorkers();
  const createClassType = useCreateClassType();
  const updateClassType = useUpdateClassType();
  const showToast = useToast();

  const [form, setForm] = useState<CreateClassTypeData>({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    instructor_id: editing?.instructor_id ?? null,
    duration_minutes: editing?.duration_minutes ?? 60,
    capacity: editing?.capacity ?? 20,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await updateClassType.mutateAsync({ id: editing.id, data: form });
      } else {
        await createClassType.mutateAsync(form);
      }
      showToast(editing ? 'Tipo de clase actualizado.' : 'Tipo de clase creado.');
      onDone();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al guardar. Verifica los datos e intenta de nuevo.'));
    }
  };

  const isPending = createClassType.isPending || updateClassType.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[16px] border border-outline-variant p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={md3InputLabelClass}>Nombre *</label>
          <input required className={md3TextFieldClass} value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label className={md3InputLabelClass}>Instructor</label>
          <select
            className={`${md3TextFieldClass} appearance-none`}
            value={form.instructor_id ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, instructor_id: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="">Sin asignar</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={md3InputLabelClass}>Duración (minutos)</label>
          <input type="number" min={1} className={md3TextFieldClass} value={form.duration_minutes}
            onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} />
        </div>
        <div>
          <label className={md3InputLabelClass}>Cupo</label>
          <input type="number" min={1} className={md3TextFieldClass} value={form.capacity}
            onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))} />
        </div>
      </div>
      <div>
        <label className={md3InputLabelClass}>Descripción</label>
        <input className={md3TextFieldClass} value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
      </div>
      {error && <p className={`text-error ${md3BodyMediumClass}`}>{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className={md3FilledButtonClass}>
          {isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tipo de clase'}
        </button>
        <button type="button" onClick={onDone} className={md3OutlinedButtonClass}>Cancelar</button>
      </div>
    </form>
  );
};

// ─── Schedule form ────────────────────────────────────────────────────────────

const ScheduleForm = ({ classTypes, onDone }: { classTypes: ClassType[]; onDone: () => void }) => {
  const createSchedule = useCreateSchedule();
  const showToast = useToast();

  const [classTypeId, setClassTypeId] = useState<number | ''>(classTypes[0]?.id ?? '');
  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState('07:00');
  const [error, setError] = useState('');

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    if (classTypeId === '') {
      setError('Selecciona un tipo de clase.');
      return;
    }
    try {
      await createSchedule.mutateAsync({ class_type_id: classTypeId, weekday, start_time: `${startTime}:00` });
      showToast('Horario creado.');
      onDone();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al guardar el horario.'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[16px] border border-outline-variant p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={md3InputLabelClass}>Tipo de clase *</label>
          <select
            className={`${md3TextFieldClass} appearance-none`}
            value={classTypeId}
            onChange={(e) => setClassTypeId(e.target.value ? Number(e.target.value) : '')}
          >
            {classTypes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={md3InputLabelClass}>Día</label>
          <select
            className={`${md3TextFieldClass} appearance-none`}
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
          >
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={label} value={i}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={md3InputLabelClass}>Hora</label>
          <input type="time" className={md3TextFieldClass} value={startTime}
            onChange={(e) => setStartTime(e.target.value)} />
        </div>
      </div>
      {error && <p className={`text-error ${md3BodyMediumClass}`}>{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={createSchedule.isPending} className={md3FilledButtonClass}>
          {createSchedule.isPending ? 'Guardando...' : 'Crear horario'}
        </button>
        <button type="button" onClick={onDone} className={md3OutlinedButtonClass}>Cancelar</button>
      </div>
    </form>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const ClassSettingsPage = () => {
  const navigate = useNavigate();
  const role = useOrgStore((state) => state.role);
  const showToast = useToast();

  useEffect(() => {
    if (role && role !== 'admin') navigate('/dashboard', { replace: true });
  }, [role, navigate]);

  const { data: classTypes = [], isLoading: loadingTypes } = useClassTypes();
  const { data: schedules = [], isLoading: loadingSchedules } = useSchedules();
  const deactivateClassType = useDeactivateClassType();
  const deactivateSchedule = useDeactivateSchedule();

  const [typeForm, setTypeForm] = useState<{ open: boolean; editing: ClassType | null }>({ open: false, editing: null });
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);

  if (role && role !== 'admin') return null;

  const activeClassTypes = classTypes.filter((c) => c.is_active);

  return (
    <div className="space-y-8">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Configuración</span>
        <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>Horarios de clases</h1>
        <p className={`mt-2 max-w-2xl text-on-surface-variant ${md3BodyMediumClass}`}>
          Define los tipos de clase y sus horarios recurrentes. Las sesiones del calendario se generan solas a partir de acá.
        </p>
      </section>

      {/* Tipos de clase */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className={md3TitleMediumClass}>Tipos de clase</h2>
          {!typeForm.open && (
            <button type="button" onClick={() => setTypeForm({ open: true, editing: null })} className={md3FilledButtonClass}>
              + Nuevo tipo de clase
            </button>
          )}
        </div>

        {typeForm.open && (
          <div className="mb-4">
            <ClassTypeForm editing={typeForm.editing} onDone={() => setTypeForm({ open: false, editing: null })} />
          </div>
        )}

        {loadingTypes ? (
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : classTypes.length === 0 ? (
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Aún no hay tipos de clase. Crea el primero.</p>
        ) : (
          <div className="space-y-2">
            {classTypes.map((c) => (
              <div key={c.id} className="flex items-center gap-4 rounded-[16px] border border-outline-variant p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-on-surface">{c.name}</p>
                    {!c.is_active && (
                      <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                        Desactivado
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-on-surface-variant ${md3BodyMediumClass}`}>
                    {c.instructor_name || 'Sin instructor'} · {c.duration_minutes} min · cupo {c.capacity}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button type="button" onClick={() => setTypeForm({ open: true, editing: c })}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">
                    Editar
                  </button>
                  {c.is_active && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deactivateClassType.mutateAsync(c.id);
                          showToast('Tipo de clase desactivado.');
                        } catch (err) {
                          showToast(getApiErrorMessage(err, 'No se pudo desactivar el tipo de clase.'), 'error');
                        }
                      }}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-error hover:bg-error/8 transition"
                    >
                      Desactivar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Horarios recurrentes */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className={md3TitleMediumClass}>Horarios recurrentes</h2>
          {!scheduleFormOpen && activeClassTypes.length > 0 && (
            <button type="button" onClick={() => setScheduleFormOpen(true)} className={md3FilledButtonClass}>
              + Nuevo horario
            </button>
          )}
        </div>

        {activeClassTypes.length === 0 ? (
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
            Crea primero un tipo de clase para poder asignarle un horario.
          </p>
        ) : (
          <>
            {scheduleFormOpen && (
              <div className="mb-4">
                <ScheduleForm classTypes={activeClassTypes} onDone={() => setScheduleFormOpen(false)} />
              </div>
            )}

            {loadingSchedules ? (
              <div className="flex justify-center py-8">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
              </div>
            ) : schedules.length === 0 ? (
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Aún no hay horarios. Crea el primero.</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 rounded-[16px] border border-outline-variant p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-on-surface">
                        {s.class_type_name} — {WEEKDAY_LABELS[s.weekday]} {s.start_time.slice(0, 5)}
                      </p>
                      {!s.is_active && (
                        <span className="mt-1 inline-block rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                          Desactivado
                        </span>
                      )}
                    </div>
                    {s.is_active && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deactivateSchedule.mutateAsync(s.id);
                            showToast('Horario desactivado.');
                          } catch (err) {
                            showToast(getApiErrorMessage(err, 'No se pudo desactivar el horario.'), 'error');
                          }
                        }}
                        className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-error hover:bg-error/8 transition"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
