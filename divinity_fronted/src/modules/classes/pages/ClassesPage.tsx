import { useMemo, useState } from 'react';

import { useModulePermissions } from '@/shared/hooks/useModulePermission';
import {
  md3BodyMediumClass,
  md3HeadlineMediumClass,
  md3OverlineClass,
  md3SurfaceClass,
} from '@/shared/ui/material';
import { addDays, toISODate } from '@/shared/utils/date';
import { SessionDetailModal } from '../components/SessionDetailModal';
import { useSessions } from '../hooks/useClasses';
import type { ClassSession } from '../types';

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const mondayOf = (d: Date): Date => {
  const day = (d.getDay() + 6) % 7; // 0=lunes...6=domingo
  return addDays(d, -day);
};

const occupancyClass = (enrolled: number, capacity: number): string => {
  if (capacity <= 0) return 'bg-surface-container text-on-surface-variant';
  const ratio = enrolled / capacity;
  if (ratio >= 1) return 'bg-error-container text-on-error-container';
  if (ratio >= 0.8) return 'bg-secondary-container text-on-secondary-container';
  return 'bg-tertiary-container text-on-tertiary-container';
};

export const ClassesPage = () => {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const { canView } = useModulePermissions('classes');

  const dateFrom = toISODate(weekStart);
  const dateTo = toISODate(addDays(weekStart, 6));
  const { data: sessions = [], isLoading } = useSessions(dateFrom, dateTo);

  const byDate = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return map;
  }, [sessions]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (!canView) return null;

  return (
    <div className="space-y-6">
      {selectedSessionId !== null && (
        <SessionDetailModal sessionId={selectedSessionId} onClose={() => setSelectedSessionId(null)} />
      )}

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Gestión</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Clases</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Calendario semanal de clases y cupos.
        </p>
      </section>

      <section className={`${md3SurfaceClass} p-4 sm:p-6`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="rounded-full border border-outline-variant px-3.5 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-on-surface/8"
          >
            ← Semana anterior
          </button>
          <p className="text-sm font-semibold text-on-surface">
            {weekStart.toLocaleDateString('es', { day: 'numeric', month: 'short' })} – {addDays(weekStart, 6).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </p>
          <button
            type="button"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="rounded-full border border-outline-variant px-3.5 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-on-surface/8"
          >
            Semana siguiente →
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {days.map((day) => {
              const iso = toISODate(day);
              const daySessions = byDate.get(iso) ?? [];
              return (
                <div key={iso} className="rounded-2xl border border-outline-variant/60 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {WEEKDAY_LABELS[(day.getDay() + 6) % 7]}
                    <span className="ml-1 font-normal normal-case">{day.getDate()}</span>
                  </p>
                  {daySessions.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/70">Sin clases</p>
                  ) : (
                    <div className="space-y-2">
                      {daySessions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSessionId(s.id)}
                          className={`w-full rounded-xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                            s.status === 'cancelled' ? 'border-outline-variant/40 opacity-60' : 'border-outline-variant/60'
                          }`}
                        >
                          <p className="text-xs font-semibold text-on-surface">{s.start_time.slice(0, 5)}</p>
                          <p className="truncate text-sm font-medium text-on-surface">{s.class_type_name}</p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              s.status === 'cancelled'
                                ? 'bg-surface-container text-on-surface-variant'
                                : occupancyClass(s.enrolled_count, s.capacity)
                            }`}
                          >
                            {s.status === 'cancelled' ? 'Cancelada' : `${s.enrolled_count}/${s.capacity}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
