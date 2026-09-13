import { useMemo, useState } from 'react';

import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineMediumClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
} from '@/shared/ui/material';
import { addDays, toISODate } from '@/shared/utils/date';
import { usePortalCancelEnrollment, usePortalEnroll, usePortalSessions } from '../hooks/useMemberPortal';
import type { PortalClassSession } from '../types';

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const mondayOf = (d: Date): Date => {
  const day = (d.getDay() + 6) % 7;
  return addDays(d, -day);
};

const occupancyClass = (enrolled: number, capacity: number): string => {
  if (capacity <= 0) return 'bg-surface-container text-on-surface-variant';
  const ratio = enrolled / capacity;
  if (ratio >= 1) return 'bg-error-container text-on-error-container';
  if (ratio >= 0.8) return 'bg-secondary-container text-on-secondary-container';
  return 'bg-tertiary-container text-on-tertiary-container';
};

const SessionRow = ({ session }: { session: PortalClassSession }) => {
  const [error, setError] = useState('');
  const enroll = usePortalEnroll();
  const cancel = usePortalCancelEnrollment();

  const isFull = session.enrolled_count >= session.capacity;
  const isBooked = session.my_enrollment_status === 'booked' || session.my_enrollment_status === 'attended';

  const handleEnroll = async () => {
    setError('');
    try {
      await enroll.mutateAsync(session.id);
    } catch {
      setError('No se pudo reservar (¿cupo lleno?).');
    }
  };

  const handleCancel = async () => {
    if (session.my_enrollment_id === null) return;
    setError('');
    try {
      await cancel.mutateAsync(session.my_enrollment_id);
    } catch {
      setError('No se pudo cancelar la reserva.');
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/60 p-4">
      <div className="min-w-0">
        <p className="font-semibold text-on-surface">{session.class_type_name}</p>
        <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
          {session.start_time.slice(0, 5)} · {session.instructor_name || 'Sin instructor'}
        </p>
        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${occupancyClass(session.enrolled_count, session.capacity)}`}>
          {session.enrolled_count}/{session.capacity} cupos
        </span>
        {error && <p className="mt-1 text-xs font-medium text-error">{error}</p>}
      </div>
      {session.status === 'cancelled' ? (
        <span className="flex-shrink-0 rounded-full bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
          Cancelada
        </span>
      ) : isBooked ? (
        <button
          type="button"
          disabled={cancel.isPending}
          onClick={handleCancel}
          className={`flex-shrink-0 ${md3OutlinedButtonClass}`}
        >
          Reservado — Cancelar
        </button>
      ) : (
        <button
          type="button"
          disabled={enroll.isPending || isFull}
          onClick={handleEnroll}
          className={`flex-shrink-0 ${md3FilledButtonClass} disabled:opacity-50`}
        >
          {isFull ? 'Sin cupo' : 'Reservar'}
        </button>
      )}
    </div>
  );
};

export const PortalClassesPage = () => {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const dateFrom = toISODate(weekStart);
  const dateTo = toISODate(addDays(weekStart, 6));
  const { data: sessions = [], isLoading } = usePortalSessions(dateFrom, dateTo);

  const byDate = useMemo(() => {
    const map = new Map<string, PortalClassSession[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return map;
  }, [sessions]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Portal del miembro</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Clases</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>Reserva tu lugar en las próximas clases.</p>
      </section>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setWeekStart((d) => addDays(d, -7))} className={md3OutlinedButtonClass}>
          ← Anterior
        </button>
        <p className="text-sm font-semibold text-on-surface">
          {weekStart.toLocaleDateString('es', { day: 'numeric', month: 'short' })} – {addDays(weekStart, 6).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
        </p>
        <button type="button" onClick={() => setWeekStart((d) => addDays(d, 7))} className={md3OutlinedButtonClass}>
          Siguiente →
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        </div>
      ) : (
        <div className="space-y-5">
          {days.map((day) => {
            const iso = toISODate(day);
            const daySessions = byDate.get(iso) ?? [];
            if (daySessions.length === 0) return null;
            return (
              <section key={iso}>
                <h2 className="mb-2 text-sm font-semibold text-on-surface">
                  {WEEKDAY_LABELS[(day.getDay() + 6) % 7]} {day.getDate()}
                </h2>
                <div className="space-y-2">
                  {daySessions.map((s) => (
                    <SessionRow key={s.id} session={s} />
                  ))}
                </div>
              </section>
            );
          })}
          {sessions.length === 0 && (
            <p className={`text-center text-on-surface-variant ${md3BodyMediumClass}`}>
              No hay clases programadas esta semana.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
