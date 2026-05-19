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
  const [error, setError] = useState('');

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] bg-surface shadow-2xl`}>
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

            {/* Campos estándar habilitados */}
            {enabledStandard.length > 0 && (
              <div className="space-y-4 rounded-[16px] border border-outline-variant p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Campos adicionales
                </p>
                {enabledStandard.map((cfg) => (
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
  );
};
