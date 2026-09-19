import { useState } from 'react';

import { useMembers } from '@/modules/members/hooks/useMembers';
import { useModulePermissions } from '@/shared/hooks/useModulePermission';
import { useToast } from '@/shared/hooks/useToast';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import {
  md3BodyMediumClass,
  md3DestructiveButtonClass,
  md3InputLabelClass,
  md3ModalBackdropClass,
  md3ModalPanelAnimClass,
  md3OutlinedButtonClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import {
  useCancelEnrollment,
  useCancelSession,
  useEnrollMember,
  useMarkAttended,
  useSessionDetail,
} from '../hooks/useClasses';
import type { EnrollmentStatus } from '../types';

const ENROLLMENT_STATUS_CONFIG: Record<EnrollmentStatus, { label: string; cls: string }> = {
  booked: { label: 'Reservado', cls: 'bg-primary-container text-on-primary-container' },
  attended: { label: 'Asistió', cls: 'bg-tertiary-container text-on-tertiary-container' },
  no_show: { label: 'No asistió', cls: 'bg-surface-container text-on-surface-variant' },
  cancelled: { label: 'Cancelada', cls: 'bg-error-container/60 text-on-error-container' },
};

interface Props {
  sessionId: number;
  onClose: () => void;
}

export const SessionDetailModal = ({ sessionId, onClose }: Props) => {
  const { data: session, isLoading } = useSessionDetail(sessionId);
  const { canCreate, canEdit } = useModulePermissions('classes');
  const showToast = useToast();
  const enroll = useEnrollMember();
  const cancelEnrollment = useCancelEnrollment(sessionId);
  const markAttended = useMarkAttended(sessionId);
  const cancelSession = useCancelSession();

  const [search, setSearch] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { data: memberResults } = useMembers(1, search, '');
  const results = search.trim() ? (memberResults?.results ?? []) : [];

  const handleEnroll = async (memberId: number) => {
    try {
      await enroll.mutateAsync({ sessionId, memberId });
      setSearch('');
      showToast('Miembro inscrito.');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'No se pudo inscribir (¿cupo lleno o ya inscrito?).'), 'error');
    }
  };

  const handleCancelEnrollment = async (enrollmentId: number) => {
    try {
      await cancelEnrollment.mutateAsync(enrollmentId);
      showToast('Inscripción cancelada.');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'No se pudo cancelar la inscripción.'), 'error');
    }
  };

  const handleAttend = async (enrollmentId: number) => {
    try {
      await markAttended.mutateAsync(enrollmentId);
      showToast('Asistencia marcada.');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'No se pudo marcar la asistencia.'), 'error');
    }
  };

  const handleCancelSession = async () => {
    try {
      await cancelSession.mutateAsync(sessionId);
      showToast('Clase cancelada. Se avisó por email a los miembros inscritos.');
      onClose();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'No se pudo cancelar la clase.'), 'error');
    }
  };

  return (
    <div className={md3ModalBackdropClass}>
      <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] bg-surface shadow-2xl ${md3ModalPanelAnimClass}`}>
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className={md3TitleMediumClass}>
              {session ? `${session.class_type_name} — ${session.start_time.slice(0, 5)}` : 'Cargando...'}
            </h3>
            <button type="button" onClick={onClose}
              className="rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading || !session ? (
            <div className="flex justify-center py-8">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                {session.date} · {session.instructor_name || 'Sin instructor asignado'} · {session.enrolled_count}/{session.capacity} cupos
              </p>

              {session.status === 'cancelled' && (
                <p className="rounded-2xl bg-error-container/60 px-4 py-2.5 text-sm font-medium text-on-error-container">
                  Esta clase fue cancelada.
                </p>
              )}

              {canCreate && session.status !== 'cancelled' && (
                <div>
                  <label className={md3InputLabelClass}>Inscribir miembro</label>
                  <input
                    className={md3TextFieldClass}
                    placeholder="Nombre o correo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {results.length > 0 && (
                    <div className="mt-2 max-h-40 divide-y divide-outline-variant/40 overflow-y-auto rounded-xl border border-outline-variant">
                      {results.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleEnroll(m.id)}
                          disabled={enroll.isPending}
                          className="flex w-full items-center justify-between p-2.5 text-left transition hover:bg-on-surface/4"
                        >
                          <span className="font-medium text-on-surface">{m.full_name}</span>
                          <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>{m.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Inscritos ({session.enrollments.filter((e) => e.status !== 'cancelled').length})
                </p>
                {session.enrollments.length === 0 ? (
                  <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Nadie inscrito todavía.</p>
                ) : (
                  session.enrollments.map((e) => {
                    const cfg = ENROLLMENT_STATUS_CONFIG[e.status];
                    return (
                      <div key={e.id} className="flex items-center justify-between rounded-2xl border border-outline-variant/60 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-on-surface">{e.member_name}</p>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {canEdit && e.status === 'booked' && (
                          <div className="flex flex-shrink-0 gap-1.5">
                            <button type="button" onClick={() => handleAttend(e.id)}
                              className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/8 transition">
                              Asistió
                            </button>
                            <button type="button" onClick={() => handleCancelEnrollment(e.id)}
                              className="rounded-full px-3 py-1.5 text-xs font-medium text-error hover:bg-error/8 transition">
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {canEdit && session.status !== 'cancelled' && (
                <div className="border-t border-outline-variant pt-4">
                  {confirmCancel ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`text-error ${md3BodyMediumClass}`}>¿Cancelar toda la clase?</span>
                      <button type="button" onClick={handleCancelSession} className={md3DestructiveButtonClass}>
                        Sí, cancelar
                      </button>
                      <button type="button" onClick={() => setConfirmCancel(false)} className={md3OutlinedButtonClass}>
                        No
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmCancel(true)} className={md3DestructiveButtonClass}>
                      Cancelar clase
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
