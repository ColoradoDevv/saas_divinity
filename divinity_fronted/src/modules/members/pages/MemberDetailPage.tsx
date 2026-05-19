import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import {
  md3BodyMediumClass,
  md3DestructiveButtonClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3LabelLargeClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import { MemberFormModal } from '../components/MemberFormModal';
import { useDeactivateMember, useMember } from '../hooks/useMembers';
import type { MemberStatus } from '../types';

const STATUS_CONFIG: Record<MemberStatus, { label: string; cls: string }> = {
  active:    { label: 'Activo',     cls: 'bg-tertiary-container text-on-tertiary-container' },
  inactive:  { label: 'Inactivo',   cls: 'bg-surface-container text-on-surface-variant' },
  suspended: { label: 'Suspendido', cls: 'bg-error-container text-on-error-container' },
};

const FieldRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-start sm:gap-4">
    <dt className={`w-full flex-shrink-0 sm:w-40 text-on-surface-variant ${md3BodyMediumClass}`}>
      {label}
    </dt>
    <dd className={`font-medium text-on-surface ${md3LabelLargeClass}`}>
      {value || '—'}
    </dd>
  </div>
);

export const MemberDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useOrgStore((state) => state.role);
  const isAdmin = role === 'admin';
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const { data: member, isLoading, isError } = useMember(Number(id));
  const deactivate = useDeactivateMember();

  const [showEdit, setShowEdit] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const handleDeactivate = async () => {
    if (!member) return;
    await deactivate.mutateAsync(member.id);
    navigate('/members');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
      </div>
    );
  }

  if (isError || !member) {
    return (
      <section className={`${md3SurfaceClass} p-8 text-center`}>
        <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Miembro no encontrado.</p>
        <button type="button" onClick={() => navigate('/members')} className={`mt-4 ${md3OutlinedButtonClass}`}>
          Volver a miembros
        </button>
      </section>
    );
  }

  const statusCfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.inactive;
  const standardEntries = Object.entries(member.standard_fields);
  const customEntries = Object.entries(member.custom_fields);

  return (
    <div className="space-y-6">
      {showEdit && (
        <MemberFormModal editing={member} onClose={() => setShowEdit(false)} />
      )}

      {/* Header */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/members')}
              className={`flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition ${md3BodyMediumClass}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Miembros
            </button>
            <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>{member.full_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
              <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                Desde {member.created_at ? new Date(member.created_at).toLocaleDateString('es') : '—'}
              </span>
            </div>
          </div>

          <div className="flex flex-shrink-0 gap-2">
            {isAdminOrManager && (
              <button type="button" onClick={() => setShowEdit(true)} className={md3OutlinedButtonClass}>
                Editar
              </button>
            )}
            {isAdmin && member.status === 'active' && (
              confirmDeactivate ? (
                <div className="flex items-center gap-2">
                  <span className={`text-error ${md3BodyMediumClass}`}>¿Desactivar?</span>
                  <button type="button" onClick={handleDeactivate}
                    disabled={deactivate.isPending}
                    className={md3DestructiveButtonClass}>
                    {deactivate.isPending ? 'Desactivando...' : 'Confirmar'}
                  </button>
                  <button type="button" onClick={() => setConfirmDeactivate(false)}
                    className={md3OutlinedButtonClass}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDeactivate(true)}
                  className={md3DestructiveButtonClass}>
                  Desactivar
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* Datos principales */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <h2 className={`mb-4 ${md3TitleMediumClass}`}>Información principal</h2>
        <dl className="divide-y divide-outline-variant/40">
          <FieldRow label="Nombre completo" value={member.full_name} />
          <FieldRow label="Correo" value={member.email} />
          <FieldRow label="Teléfono" value={member.phone} />
        </dl>
      </section>

      {/* Campos estándar adicionales */}
      {standardEntries.length > 0 && (
        <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
          <h2 className={`mb-4 ${md3TitleMediumClass}`}>Información adicional</h2>
          <dl className="divide-y divide-outline-variant/40">
            {standardEntries.map(([key, val]) => (
              <FieldRow key={key} label={key.replace(/_/g, ' ')} value={val} />
            ))}
          </dl>
        </section>
      )}

      {/* Campos personalizados */}
      {customEntries.length > 0 && (
        <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
          <h2 className={`mb-4 ${md3TitleMediumClass}`}>Campos personalizados</h2>
          <dl className="divide-y divide-outline-variant/40">
            {customEntries.map(([key, val]) => (
              <FieldRow key={key} label={key.replace(/_/g, ' ')} value={val} />
            ))}
          </dl>
        </section>
      )}
    </div>
  );
};
