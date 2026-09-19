import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import {
  useBiometricDevices,
  useCreateEnrollment,
  useDeleteEnrollment,
  useMemberEnrollments,
} from '@/modules/attendance/hooks/useAttendance';
import {
  md3BodyMediumClass,
  md3DestructiveButtonClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3LabelLargeClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import {
  useFreezeSubscription,
  useMemberBilling,
  useResumeSubscription,
} from '@/modules/billing/hooks/useBilling';
import { PAYMENT_METHOD_LABELS, SUBSCRIPTION_STATUS_CONFIG } from '@/modules/billing/constants';
import { RenewModal } from '@/modules/billing/components/RenewModal';
import { useCurrencyFormatter } from '@/shared/hooks/useCurrencyFormatter';
import { useToast } from '@/shared/hooks/useToast';
import { ScrollableTableWrapper } from '@/shared/components/ScrollableTableWrapper';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { MemberFormModal } from '../components/MemberFormModal';
import { MemberQRCode } from '../components/MemberQRCode';
import { useActivatePortalAccess, useDeactivateMember, useMember } from '../hooks/useMembers';
import type { Member, MemberStatus } from '../types';

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

// ─── Sección Acceso al portal ─────────────────────────────────────────────────

const PortalAccessSection = ({ member }: { member: Member }) => {
  const activatePortalAccess = useActivatePortalAccess();
  const showToast = useToast();
  const [confirmResend, setConfirmResend] = useState(false);

  const handleSend = async () => {
    try {
      await activatePortalAccess.mutateAsync(member.id);
      showToast('Invitación enviada por email.');
      setConfirmResend(false);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'No se pudo enviar la invitación.'), 'error');
    }
  };

  return (
    <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
      <h2 className={`mb-4 ${md3TitleMediumClass}`}>Acceso al portal</h2>
      {!member.has_portal_access ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
            Este miembro todavía no tiene acceso al portal de autoservicio.
          </p>
          <button type="button" onClick={handleSend} disabled={activatePortalAccess.isPending} className={md3FilledButtonClass}>
            {activatePortalAccess.isPending ? 'Enviando...' : 'Enviar invitación al portal'}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-tertiary-container px-3 py-1 text-sm font-medium text-on-tertiary-container">
            Portal activado
          </span>
          {confirmResend ? (
            <div className="flex items-center gap-2">
              <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>¿Reenviar invitación?</span>
              <button type="button" onClick={handleSend} disabled={activatePortalAccess.isPending} className={md3FilledButtonClass}>
                Sí, reenviar
              </button>
              <button type="button" onClick={() => setConfirmResend(false)} className={md3OutlinedButtonClass}>
                No
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmResend(true)} className={md3OutlinedButtonClass}>
              Reenviar invitación
            </button>
          )}
        </div>
      )}
    </section>
  );
};

// ─── Sección Huella digital (complemento) ─────────────────────────────────────

const BiometricEnrollmentSection = ({ member }: { member: Member }) => {
  const showToast = useToast();
  const { data: devices = [] } = useBiometricDevices();
  const { data: enrollments = [], isLoading } = useMemberEnrollments(member.id);

  const [showForm, setShowForm] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | ''>('');
  const [externalUserId, setExternalUserId] = useState('');
  const [error, setError] = useState('');

  const createEnrollment = useCreateEnrollment(selectedDeviceId === '' ? 0 : selectedDeviceId);
  const deleteEnrollment = useDeleteEnrollment();

  const enrolledDeviceIds = new Set(enrollments.map((e) => e.device_id));
  const availableDevices = devices.filter((d) => d.is_active && !enrolledDeviceIds.has(d.id));

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    if (selectedDeviceId === '') {
      setError('Selecciona un dispositivo.');
      return;
    }
    try {
      await createEnrollment.mutateAsync({ memberId: member.id, externalUserId: externalUserId.trim() });
      showToast('Huella enrolada.');
      setShowForm(false);
      setExternalUserId('');
      setSelectedDeviceId('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo enrolar (¿ese id ya está en uso en este dispositivo?).'));
    }
  };

  const handleRemove = async (enrollmentId: number, deviceId: number) => {
    try {
      await deleteEnrollment.mutateAsync({ deviceId, enrollmentId });
      showToast('Enrolamiento eliminado.');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'No se pudo eliminar el enrolamiento.'), 'error');
    }
  };

  return (
    <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className={md3TitleMediumClass}>Huella digital</h2>
        {!showForm && availableDevices.length > 0 && (
          <button type="button" onClick={() => setShowForm(true)} className={md3OutlinedButtonClass}>
            + Enrolar en un dispositivo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-4 rounded-[16px] border border-outline-variant p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={md3InputLabelClass}>Dispositivo *</label>
              <select
                className={`${md3TextFieldClass} appearance-none`}
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seleccionar...</option>
                {availableDevices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={md3InputLabelClass}>Id en el dispositivo *</label>
              <input
                required
                className={md3TextFieldClass}
                placeholder="el id que arrojó el equipo al tomar la huella"
                value={externalUserId}
                onChange={(e) => setExternalUserId(e.target.value)}
              />
            </div>
          </div>
          {error && <p className={`text-error ${md3BodyMediumClass}`}>{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={createEnrollment.isPending} className={md3FilledButtonClass}>
              {createEnrollment.isPending ? 'Guardando...' : 'Enrolar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={md3OutlinedButtonClass}>Cancelar</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        </div>
      ) : enrollments.length === 0 ? (
        <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
          Este miembro no está enrolado en ningún dispositivo biométrico todavía.
        </p>
      ) : (
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-2xl border border-outline-variant/60 px-4 py-2.5">
              <div>
                <p className="font-medium text-on-surface">{e.device_name}</p>
                <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>id: {e.external_user_id}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(e.id, e.device_id)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-error hover:bg-error/8 transition"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const MembershipSection = ({ memberId, canManage }: { memberId: number; canManage: boolean }) => {
  const { data: billing, isLoading } = useMemberBilling(memberId);
  const freeze = useFreezeSubscription(memberId);
  const resume = useResumeSubscription(memberId);
  const formatMoney = useCurrencyFormatter();
  const showToast = useToast();
  const [showRenew, setShowRenew] = useState(false);

  const current = billing?.current_subscription ?? null;
  const statusCfg = current ? (SUBSCRIPTION_STATUS_CONFIG[current.status] ?? SUBSCRIPTION_STATUS_CONFIG.cancelled) : null;

  return (
    <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
      {showRenew && <RenewModal memberId={memberId} onClose={() => setShowRenew(false)} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className={md3TitleMediumClass}>Membresía</h2>
        {canManage && (
          <button type="button" onClick={() => setShowRenew(true)} className={md3FilledButtonClass}>
            Renovar membresía
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        </div>
      ) : !current ? (
        <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
          Este miembro no tiene una membresía activa.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusCfg!.cls}`}>
              {statusCfg!.label}
            </span>
            <span className={`text-on-surface ${md3LabelLargeClass}`}>{current.plan_name}</span>
            <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              Vence el {new Date(current.end_date).toLocaleDateString('es')}
            </span>
          </div>

          {canManage && (
            <div className="flex gap-2">
              {current.status === 'active' && (
                <button type="button" onClick={() => freeze.mutate(current.id, {
                  onError: (err) => showToast(getApiErrorMessage(err, 'No se pudo congelar la membresía.'), 'error'),
                })}
                  disabled={freeze.isPending} className={md3OutlinedButtonClass}>
                  {freeze.isPending ? 'Congelando...' : 'Congelar'}
                </button>
              )}
              {current.status === 'frozen' && (
                <button type="button" onClick={() => resume.mutate(current.id, {
                  onError: (err) => showToast(getApiErrorMessage(err, 'No se pudo reanudar la membresía.'), 'error'),
                })}
                  disabled={resume.isPending} className={md3OutlinedButtonClass}>
                  {resume.isPending ? 'Reanudando...' : 'Reanudar'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {billing && billing.payments.length > 0 && (
        <div className="mt-6">
          <h3 className={`mb-3 text-on-surface-variant ${md3BodyMediumClass}`}>Historial de pagos</h3>
          <ScrollableTableWrapper className="rounded-[16px] border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="px-4 py-2.5 text-left font-semibold text-on-surface-variant">Fecha</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-on-surface-variant">Monto</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-on-surface-variant">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {billing.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 text-on-surface-variant">{new Date(p.paid_at).toLocaleDateString('es')}</td>
                    <td className="px-4 py-2.5 text-on-surface">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-2.5 text-on-surface-variant">{PAYMENT_METHOD_LABELS[p.method]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTableWrapper>
        </div>
      )}
    </section>
  );
};

export const MemberDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useOrgStore((state) => state.role);
  const organization = useOrgStore((state) => state.organization);
  const allowedModules = useOrgStore((state) => state.allowedModules);
  const isAdmin = role === 'admin';
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const activeModules = allowedModules !== null ? allowedModules : (organization?.enabled_modules ?? []);
  const billingModuleActive = activeModules.includes('payments');
  const biometricDevicesActive = activeModules.includes('biometric_devices');

  const { data: member, isLoading, isError } = useMember(Number(id));
  const deactivate = useDeactivateMember();
  const showToast = useToast();

  const [showEdit, setShowEdit] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const handleDeactivate = async () => {
    if (!member) return;
    try {
      await deactivate.mutateAsync(member.id);
      navigate('/members');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'No se pudo desactivar al miembro.'), 'error');
    }
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
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <dl className="w-full divide-y divide-outline-variant/40">
            <FieldRow label="Nombre completo" value={member.full_name} />
            <FieldRow label="Correo" value={member.email} />
            <FieldRow label="Teléfono" value={member.phone} />
            <FieldRow label="Código de miembro" value={member.member_code} />
          </dl>
          {member.member_code && (
            <div className="flex flex-shrink-0 flex-col items-center gap-2">
              <MemberQRCode value={member.member_code} />
              <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>Check-in</span>
            </div>
          )}
        </div>
      </section>

      {/* Acceso al portal — solo admin */}
      {isAdmin && <PortalAccessSection member={member} />}

      {/* Huella digital — complemento, solo si la organización lo tiene otorgado */}
      {isAdmin && biometricDevicesActive && <BiometricEnrollmentSection member={member} />}

      {/* Membresía — solo si el módulo de pagos está activo para este usuario */}
      {billingModuleActive && <MembershipSection memberId={member.id} canManage={isAdminOrManager} />}

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
