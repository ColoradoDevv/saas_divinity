import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useOrgStore } from '@/app/store/org';
import { PAYMENT_METHOD_LABELS } from '@/modules/billing/constants';
import { usePlans } from '@/modules/billing/hooks/useBilling';
import { billingService } from '@/modules/billing/services/billingService';
import type { PaymentMethod } from '@/modules/billing/types';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { useCurrencyFormatter } from '@/shared/hooks/useCurrencyFormatter';
import { useToast } from '@/shared/hooks/useToast';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3InputLabelClass,
  md3ModalBackdropClass,
  md3ModalPanelAnimClass,
  md3OutlinedButtonClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import { useCustomFields } from '../hooks/useCustomFields';
import { useFieldConfig } from '../hooks/useFieldConfig';
import { useCreateMember, useUpdateMember } from '../hooks/useMembers';
import type { CreateMemberData, Member } from '../types';
import { PhotoCaptureModal } from './PhotoCaptureModal';

interface Props {
  editing?: Member | null;
  onClose: () => void;
}

export const MemberFormModal = ({ editing, onClose }: Props) => {
  const { data: fieldConfigs = [] } = useFieldConfig();
  const { data: customFields = [] } = useCustomFields();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const showToast = useToast();
  const qc = useQueryClient();
  const formatMoney = useCurrencyFormatter();

  const organization = useOrgStore((state) => state.organization);
  const allowedModules = useOrgStore((state) => state.allowedModules);
  const activeModules = allowedModules !== null ? allowedModules : (organization?.enabled_modules ?? []);
  const billingModuleActive = activeModules.includes('payments');
  const showPlanStep = !editing && billingModuleActive;

  const { data: plans = [] } = usePlans(true, showPlanStep);

  const baseSteps = ['Datos básicos', 'Datos adicionales', 'Foto', 'Plan de membresía'] as const;
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  // El paso "Registrar pago" solo aparece si se eligió un plan en el paso anterior.
  const steps = showPlanStep
    ? (selectedPlanId !== '' ? [...baseSteps, 'Registrar pago'] as const : baseSteps)
    : (['Datos básicos', 'Datos adicionales', 'Foto'] as const);
  const currentStep = steps[stepIndex] as (typeof baseSteps)[number] | 'Registrar pago';

  const enabledStandard = fieldConfigs.filter((c) => c.is_enabled);
  const enabledCustom = customFields.filter((c) => c.is_enabled);

  // Photo is always shown; check field config only to know if it's required
  const photoConfig = fieldConfigs.find((c) => c.field_name === 'photo');
  const photoRequired = photoConfig?.is_required ?? false;

  const [fixed, setFixed] = useState({
    first_name: editing?.first_name ?? '',
    last_name: editing?.last_name ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
  });
  const [standardValues, setStandardValues] = useState<Record<string, string>>(
    editing?.standard_fields ?? {},
  );
  const [customValues, setCustomValues] = useState<Record<string, string>>(
    editing?.custom_fields ?? {},
  );
  // photo stored separately so we can show a preview without polluting standard_fields display
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(
    editing?.standard_fields?.photo ?? null,
  );
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(
    editing?.face_descriptor ?? null,
  );
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Paso 4 — plan de membresía / Paso 5 — registrar pago (opcional, solo al crear)
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handlePhotoConfirm = (dataUrl: string, descriptor: number[] | null) => {
    setCapturedPhoto(dataUrl);
    setStandardValues((prev) => ({ ...prev, photo: dataUrl }));
    setFaceDescriptor(descriptor);
    setShowPhotoModal(false);
  };

  const validateStep = (step: (typeof steps)[number]): string | null => {
    if (step === 'Datos básicos') {
      if (!fixed.first_name.trim()) return 'El nombre es obligatorio.';
      if (!fixed.last_name.trim()) return 'El apellido es obligatorio.';
      if (!fixed.email.trim()) return 'El correo electrónico es obligatorio.';
      return null;
    }
    if (step === 'Datos adicionales') {
      for (const cfg of enabledStandard.filter((c) => c.field_name !== 'photo' && c.is_required)) {
        if (!(standardValues[cfg.field_name] ?? '').trim()) {
          return `"${cfg.label || cfg.field_name}" es obligatorio.`;
        }
      }
      for (const cf of enabledCustom.filter((c) => c.is_required)) {
        if (!(customValues[cf.name] ?? '').trim()) {
          return `"${cf.label}" es obligatorio.`;
        }
      }
      return null;
    }
    if (step === 'Foto') {
      if (photoConfig && photoRequired && !capturedPhoto) {
        return 'La foto del miembro es obligatoria.';
      }
      return null;
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(currentStep);
    if (err) { setError(err); return; }
    setError('');
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    setError('');
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleFinalSubmit = async () => {
    const err = validateStep(currentStep);
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);

    const payload: CreateMemberData = {
      ...fixed,
      standard_fields: standardValues,
      custom_fields: customValues,
      face_descriptor: faceDescriptor,
    };

    try {
      if (editing) {
        await updateMember.mutateAsync({ id: editing.id, data: payload });
        showToast('Cambios guardados.');
      } else {
        const created = await createMember.mutateAsync(payload);
        if (selectedPlanId !== '') {
          await billingService.renewMembership({
            member_id: created.id,
            plan_id: selectedPlanId,
            method,
            amount: amount || undefined,
            notes,
          });
          qc.invalidateQueries({ queryKey: ['billing', 'expiring'] });
          qc.invalidateQueries({ queryKey: ['billing', 'summary'] });
          qc.invalidateQueries({ queryKey: ['billing', 'payments'] });
          showToast('Miembro creado y plan asignado.');
        } else {
          showToast('Miembro creado correctamente.');
        }
      }
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al guardar el miembro. Verifica los datos e intenta de nuevo.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderCustomInput = (
    fieldType: string,
    name: string,
    value: string,
    onChange: (v: string) => void,
    options: string[] | null,
    required: boolean,
  ) => {
    if (fieldType === 'select' && options) {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${md3TextFieldClass} appearance-none`}
        >
          <option value="">Seleccionar...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }
    if (fieldType === 'boolean') {
      return (
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            className="h-4 w-4 rounded border-outline text-primary"
          />
          <span className={`text-on-surface ${md3BodyMediumClass}`}>{name}</span>
        </label>
      );
    }
    const inputType = fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text';
    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={md3TextFieldClass}
        {...(required ? { 'aria-required': true } : {})}
      />
    );
  };

  const isLastStep = stepIndex === steps.length - 1;
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <>
      {showPhotoModal && (
        <PhotoCaptureModal
          onConfirm={handlePhotoConfirm}
          onCancel={() => setShowPhotoModal(false)}
        />
      )}

      <div className={md3ModalBackdropClass}>
        <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] bg-surface shadow-2xl ${md3ModalPanelAnimClass}`}>
          <div className="p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className={md3TitleMediumClass}>
                {editing ? `Editar — ${editing.full_name}` : 'Nuevo miembro'}
              </h3>
              <button type="button" onClick={onClose}
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Indicador de progreso */}
            <div className="mb-2 flex items-center gap-2">
              {steps.map((label, i) => (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i < stepIndex
                      ? 'bg-primary text-on-primary'
                      : i === stepIndex
                        ? 'border-2 border-primary text-primary'
                        : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {i < stepIndex ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 transition-colors ${i < stepIndex ? 'bg-primary' : 'bg-outline-variant'}`} />
                  )}
                </div>
              ))}
            </div>
            <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Paso {stepIndex + 1} de {steps.length} — {currentStep}
            </p>

            <div className="space-y-5">
              {/* Paso 1: Datos básicos */}
              {currentStep === 'Datos básicos' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={md3InputLabelClass}>Nombre *</label>
                    <input className={md3TextFieldClass} value={fixed.first_name}
                      onChange={(e) => setFixed((p) => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className={md3InputLabelClass}>Apellido *</label>
                    <input className={md3TextFieldClass} value={fixed.last_name}
                      onChange={(e) => setFixed((p) => ({ ...p, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className={md3InputLabelClass}>Correo electrónico *</label>
                    <input type="email" className={md3TextFieldClass} value={fixed.email}
                      onChange={(e) => setFixed((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className={md3InputLabelClass}>Teléfono</label>
                    <input type="tel" className={md3TextFieldClass} value={fixed.phone}
                      onChange={(e) => setFixed((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* Paso 2: Datos adicionales (estándar + personalizados) */}
              {currentStep === 'Datos adicionales' && (
                <>
                  {enabledStandard.filter((c) => c.field_name !== 'photo').length === 0
                    && enabledCustom.length === 0 ? (
                    <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                      Tu organización no tiene campos adicionales habilitados. Puedes activarlos en
                      Configuración → Campos de miembros.
                    </p>
                  ) : (
                    <>
                      {enabledStandard.filter((c) => c.field_name !== 'photo').length > 0 && (
                        <div className="space-y-4 rounded-[16px] border border-outline-variant p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                            Campos estándar
                          </p>
                          {enabledStandard
                            .filter((c) => c.field_name !== 'photo')
                            .map((cfg) => (
                              <div key={cfg.field_name}>
                                <label className={md3InputLabelClass}>
                                  {cfg.label || cfg.field_name}{cfg.is_required ? ' *' : ''}
                                </label>
                                <input
                                  type={cfg.field_name === 'birth_date' ? 'date' : 'text'}
                                  className={md3TextFieldClass}
                                  value={standardValues[cfg.field_name] ?? ''}
                                  onChange={(e) =>
                                    setStandardValues((p) => ({ ...p, [cfg.field_name]: e.target.value }))
                                  }
                                />
                              </div>
                            ))}
                        </div>
                      )}

                      {enabledCustom.length > 0 && (
                        <div className="space-y-4 rounded-[16px] border border-outline-variant p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                            Campos personalizados
                          </p>
                          {enabledCustom.map((cf) => (
                            <div key={cf.name}>
                              {cf.field_type !== 'boolean' && (
                                <label className={md3InputLabelClass}>
                                  {cf.label}{cf.is_required ? ' *' : ''}
                                </label>
                              )}
                              {renderCustomInput(
                                cf.field_type,
                                cf.label,
                                customValues[cf.name] ?? '',
                                (v) => setCustomValues((p) => ({ ...p, [cf.name]: v })),
                                cf.options,
                                cf.is_required,
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Paso 3: Foto */}
              {currentStep === 'Foto' && (
                <div className="rounded-[16px] border border-outline-variant p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                    Foto del miembro{photoRequired ? ' *' : ''}
                  </p>

                  {capturedPhoto ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={capturedPhoto}
                        alt="Foto del miembro"
                        className="h-20 w-20 rounded-[12px] object-cover shadow"
                      />
                      <div className="flex flex-col gap-2">
                        <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                          Foto capturada correctamente
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPhotoModal(true)}
                          className={md3OutlinedButtonClass}
                        >
                          Cambiar foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[12px] bg-surface-container">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-on-surface-variant">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M20 21a8 8 0 1 0-16 0" />
                        </svg>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPhotoModal(true)}
                        className={md3FilledButtonClass}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M20 6h-2.2a2 2 0 0 1-1.6-.8l-1.4-1.4A2 2 0 0 0 13.2 3h-2.4a2 2 0 0 0-1.6.8L7.8 5.2A2 2 0 0 1 6.2 6H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
                        </svg>
                        Tomar foto
                      </button>
                      {photoRequired && (
                        <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                          La foto es obligatoria para este miembro
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Paso 4: Plan de membresía (opcional, solo al crear) */}
              {currentStep === 'Plan de membresía' && (
                <div className="space-y-4">
                  <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                    Puedes asignar un plan ahora mismo, o hacerlo después desde la ficha del miembro.
                  </p>
                  <div>
                    <label className={md3InputLabelClass}>Plan</label>
                    <select
                      className={`${md3TextFieldClass} appearance-none`}
                      value={selectedPlanId}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : '';
                        setSelectedPlanId(id);
                        setAmount(id === '' ? '' : plans.find((p) => p.id === id)?.price ?? '');
                      }}
                    >
                      <option value="">Omitir por ahora</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.price)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Paso 5: Registrar pago (solo si se eligió un plan en el paso 4) */}
              {currentStep === 'Registrar pago' && (
                <div className="space-y-4">
                  <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                    Registra el pago inicial de la membresía de {selectedPlan?.name ?? 'este plan'}.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={md3InputLabelClass}>Método de pago</label>
                      <select
                        className={`${md3TextFieldClass} appearance-none`}
                        value={method}
                        onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                      >
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([val, lbl]) => (
                          <option key={val} value={val}>{lbl}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={md3InputLabelClass}>Monto</label>
                      <CurrencyInput
                        value={amount}
                        onChange={setAmount}
                        placeholder={selectedPlan ? formatMoney(selectedPlan.price) : ''}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={md3InputLabelClass}>Notas</label>
                    <input
                      className={md3TextFieldClass}
                      placeholder="Opcional"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className={`text-error ${md3BodyMediumClass}`}>{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                {stepIndex > 0 && (
                  <button type="button" onClick={goBack} className={md3OutlinedButtonClass}>
                    Atrás
                  </button>
                )}
                <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>
                  Cancelar
                </button>
                <div className="flex-1" />
                {isLastStep ? (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submitting}
                    className={md3FilledButtonClass}
                  >
                    {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear miembro'}
                  </button>
                ) : (
                  <button type="button" onClick={goNext} className={md3FilledButtonClass}>
                    Siguiente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
