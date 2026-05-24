import { useState } from 'react';

import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3InputLabelClass,
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

  const enabledStandard = fieldConfigs.filter((c) => c.is_enabled);
  const enabledCustom = customFields.filter((c) => c.is_enabled);

  // Check if the photo standard field is active
  const photoConfig = enabledStandard.find((c) => c.field_name === 'photo');
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
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoConfirm = (dataUrl: string) => {
    setCapturedPhoto(dataUrl);
    setStandardValues((prev) => ({ ...prev, photo: dataUrl }));
    setShowPhotoModal(false);
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');

    if (photoConfig && photoRequired && !capturedPhoto) {
      setError('La foto del miembro es obligatoria.');
      return;
    }

    const payload: CreateMemberData = {
      ...fixed,
      standard_fields: standardValues,
      custom_fields: customValues,
    };

    try {
      if (editing) {
        await updateMember.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createMember.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError('Error al guardar el miembro. Verifica los datos e intenta de nuevo.');
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
          required={required}
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
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={md3TextFieldClass}
      />
    );
  };

  const isPending = createMember.isPending || updateMember.isPending;

  return (
    <>
      {showPhotoModal && (
        <PhotoCaptureModal
          onConfirm={handlePhotoConfirm}
          onCancel={() => setShowPhotoModal(false)}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] bg-surface shadow-2xl">
          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
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

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campos fijos */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={md3InputLabelClass}>Nombre *</label>
                  <input required className={md3TextFieldClass} value={fixed.first_name}
                    onChange={(e) => setFixed((p) => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className={md3InputLabelClass}>Apellido *</label>
                  <input required className={md3TextFieldClass} value={fixed.last_name}
                    onChange={(e) => setFixed((p) => ({ ...p, last_name: e.target.value }))} />
                </div>
                <div>
                  <label className={md3InputLabelClass}>Correo electrónico *</label>
                  <input required type="email" className={md3TextFieldClass} value={fixed.email}
                    onChange={(e) => setFixed((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className={md3InputLabelClass}>Teléfono</label>
                  <input type="tel" className={md3TextFieldClass} value={fixed.phone}
                    onChange={(e) => setFixed((p) => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              {/* Campos estándar habilitados (excluye 'photo' — se maneja aparte) */}
              {enabledStandard.filter((c) => c.field_name !== 'photo').length > 0 && (
                <div className="space-y-4 rounded-[16px] border border-outline-variant p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                    Campos adicionales
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
                          required={cfg.is_required}
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

              {/* Foto del miembro (campo estándar especial) */}
              {photoConfig && (
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

              {/* Campos custom habilitados */}
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

              {error && (
                <p className={`text-error ${md3BodyMediumClass}`}>{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className={`${md3FilledButtonClass} flex-1`} disabled={isPending}>
                  {isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar miembro'}
                </button>
                <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};
