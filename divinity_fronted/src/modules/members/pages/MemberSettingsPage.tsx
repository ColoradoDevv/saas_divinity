import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import {
  md3BodyMediumClass,
  md3DestructiveButtonClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import { useCustomFields, useCreateCustomField, useUpdateCustomField, useDeleteCustomField } from '../hooks/useCustomFields';
import { useFieldConfig, useUpdateFieldConfig } from '../hooks/useFieldConfig';
import type { CreateCustomFieldData, CustomField, FieldConfig } from '../types';

const FIELD_LABELS: Record<string, string> = {
  id_number: 'Número de identidad',
  address: 'Dirección',
  birth_date: 'Fecha de nacimiento',
  phone_secondary: 'Teléfono secundario',
  photo: 'Foto',
  notes: 'Notas',
  gender: 'Género',
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Fecha',
  boolean: 'Sí / No',
  select: 'Selección',
};

// ─── Custom Field Modal ───────────────────────────────────────────────────────

const CustomFieldModal = ({
  editing,
  onClose,
}: {
  editing: CustomField | null;
  onClose: () => void;
}) => {
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();

  const [form, setForm] = useState<CreateCustomFieldData>({
    name: editing?.name ?? '',
    label: editing?.label ?? '',
    field_type: editing?.field_type ?? 'text',
    options: editing?.options ?? null,
    is_required: editing?.is_required ?? false,
    is_enabled: editing?.is_enabled ?? true,
    order: editing?.order ?? 0,
  });
  const [optionInput, setOptionInput] = useState('');
  const [error, setError] = useState('');

  const options = form.options ?? [];
  const addOption = () => {
    const val = optionInput.trim();
    if (!val || options.includes(val)) return;
    setForm((p) => ({ ...p, options: [...options, val] }));
    setOptionInput('');
  };
  const removeOption = (opt: string) =>
    setForm((p) => ({ ...p, options: (p.options ?? []).filter((o) => o !== opt) }));

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await updateField.mutateAsync({ id: editing.id, data: { ...form, name: undefined } });
      } else {
        await createField.mutateAsync(form);
      }
      onClose();
    } catch {
      setError('Error al guardar el campo. Verifica los datos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`${md3SurfaceClass} w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className={md3TitleMediumClass}>
              {editing ? 'Editar campo' : 'Nuevo campo personalizado'}
            </h3>
            <button type="button" onClick={onClose}
              className="rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!editing && (
              <div>
                <label className={md3InputLabelClass}>Nombre interno (slug) *</label>
                <input
                  required
                  className={md3TextFieldClass}
                  placeholder="ej: nivel_membresia"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                />
                <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
                  Solo letras, números y guiones bajos. No se puede cambiar después.
                </p>
              </div>
            )}

            <div>
              <label className={md3InputLabelClass}>Etiqueta visible *</label>
              <input
                required
                className={md3TextFieldClass}
                placeholder="ej: Nivel de membresía"
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>

            <div>
              <label className={md3InputLabelClass}>Tipo de campo</label>
              <select
                className={`${md3TextFieldClass} appearance-none`}
                value={form.field_type}
                onChange={(e) => setForm((p) => ({
                  ...p,
                  field_type: e.target.value as CreateCustomFieldData['field_type'],
                  options: e.target.value === 'select' ? (p.options ?? []) : null,
                }))}
              >
                {Object.entries(FIELD_TYPE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>

            {form.field_type === 'select' && (
              <div>
                <label className={md3InputLabelClass}>Opciones *</label>
                <div className="mb-2 flex gap-2">
                  <input
                    className={`${md3TextFieldClass} flex-1`}
                    placeholder="Agregar opción..."
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                  />
                  <button type="button" onClick={addOption} className={md3OutlinedButtonClass}>
                    Agregar
                  </button>
                </div>
                {options.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt) => (
                      <span key={opt}
                        className="flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-sm text-on-surface">
                        {opt}
                        <button type="button" onClick={() => removeOption(opt)}
                          className="text-on-surface-variant hover:text-error transition">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={(e) => setForm((p) => ({ ...p, is_required: e.target.checked }))}
                  className="h-4 w-4 rounded border-outline text-primary"
                />
                <span className={`font-medium text-on-surface ${md3BodyMediumClass}`}>Requerido</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(e) => setForm((p) => ({ ...p, is_enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-outline text-primary"
                />
                <span className={`font-medium text-on-surface ${md3BodyMediumClass}`}>Habilitado</span>
              </label>
            </div>

            {error && (
              <p className={`text-error ${md3BodyMediumClass}`}>{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" className={`${md3FilledButtonClass} flex-1`}
                disabled={createField.isPending || updateField.isPending}>
                {createField.isPending || updateField.isPending ? 'Guardando...' : 'Guardar campo'}
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

// ─── Main page ────────────────────────────────────────────────────────────────

export const MemberSettingsPage = () => {
  const navigate = useNavigate();
  const role = useOrgStore((state) => state.role);

  useEffect(() => {
    if (role && role !== 'admin') navigate('/dashboard', { replace: true });
  }, [role, navigate]);

  const { data: fieldConfigs = [], isLoading: loadingConfig } = useFieldConfig();
  const { data: customFields = [], isLoading: loadingCustom } = useCustomFields();
  const updateFieldConfig = useUpdateFieldConfig();
  const deleteCustomField = useDeleteCustomField();

  const [localConfigs, setLocalConfigs] = useState<FieldConfig[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customFieldModal, setCustomFieldModal] = useState<{ open: boolean; editing: CustomField | null }>({
    open: false, editing: null,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (fieldConfigs.length > 0) setLocalConfigs(fieldConfigs);
  }, [fieldConfigs]);

  const updateLocal = (index: number, patch: Partial<FieldConfig>) =>
    setLocalConfigs((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const handleSaveStandard = async () => {
    await updateFieldConfig.mutateAsync(localConfigs);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDelete = async (id: number) => {
    await deleteCustomField.mutateAsync(id);
    setConfirmDeleteId(null);
  };

  if (role && role !== 'admin') return null;

  return (
    <div className="space-y-8">
      {customFieldModal.open && (
        <CustomFieldModal
          editing={customFieldModal.editing}
          onClose={() => setCustomFieldModal({ open: false, editing: null })}
        />
      )}

      {/* Page header */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Configuración</span>
        <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>Configuración de miembros</h1>
        <p className={`mt-2 max-w-2xl text-on-surface-variant ${md3BodyMediumClass}`}>
          Define qué campos adicionales deseas capturar para cada miembro de tu organización.
        </p>
      </section>

      {/* Sección 1: Campos estándar */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className={md3TitleMediumClass}>Campos estándar opcionales</h2>
            <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
              Activa los campos que quieres recopilar. Puedes renombrar cada etiqueta.
            </p>
          </div>
          {saveSuccess && (
            <span className="rounded-full bg-tertiary-container px-4 py-1.5 text-sm font-medium text-on-tertiary-container">
              Guardado
            </span>
          )}
        </div>

        {loadingConfig ? (
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-[16px] border border-outline-variant">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container">
                    <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">Campo</th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">Etiqueta</th>
                    <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">Activado</th>
                    <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">Requerido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {localConfigs.map((cfg, i) => (
                    <tr key={cfg.field_name} className="hover:bg-on-surface/4 transition">
                      <td className="px-4 py-3 font-medium text-on-surface">
                        {FIELD_LABELS[cfg.field_name] ?? cfg.field_name}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={`${md3TextFieldClass} py-1.5 text-sm`}
                          value={cfg.label || (FIELD_LABELS[cfg.field_name] ?? cfg.field_name)}
                          onChange={(e) => updateLocal(i, { label: e.target.value })}
                          placeholder={FIELD_LABELS[cfg.field_name]}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={cfg.is_enabled}
                          onChange={(e) => updateLocal(i, {
                            is_enabled: e.target.checked,
                            is_required: e.target.checked ? cfg.is_required : false,
                          })}
                          className="h-4 w-4 rounded border-outline text-primary"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={cfg.is_required}
                          disabled={!cfg.is_enabled}
                          onChange={(e) => updateLocal(i, { is_required: e.target.checked })}
                          className="h-4 w-4 rounded border-outline text-primary disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveStandard}
                disabled={updateFieldConfig.isPending}
                className={md3FilledButtonClass}
              >
                {updateFieldConfig.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Sección 2: Campos personalizados */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className={md3TitleMediumClass}>Campos personalizados</h2>
            <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
              Crea campos propios de tu negocio. Aparecen en el formulario de cada miembro.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCustomFieldModal({ open: true, editing: null })}
            className={md3FilledButtonClass}
          >
            + Nuevo campo
          </button>
        </div>

        {loadingCustom ? (
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : customFields.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-outline-variant p-8 text-center">
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              Aún no hay campos personalizados. Crea el primero.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customFields.map((field) => (
              <div key={field.id}
                className="flex items-center gap-4 rounded-[16px] border border-outline-variant p-4 hover:bg-on-surface/4 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-on-surface">{field.label}</p>
                    <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-on-secondary-container">
                      {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                    </span>
                    {field.is_required && (
                      <span className="rounded-full bg-error-container px-2.5 py-0.5 text-[11px] font-semibold text-on-error-container">
                        Requerido
                      </span>
                    )}
                    {!field.is_enabled && (
                      <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                        Desactivado
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-on-surface-variant ${md3BodyMediumClass}`}>
                    {field.name}
                    {field.options && field.options.length > 0
                      ? ` · ${field.options.join(', ')}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  {confirmDeleteId === field.id ? (
                    <>
                      <span className={`mr-1 text-error ${md3BodyMediumClass}`}>¿Eliminar?</span>
                      <button type="button"
                        onClick={() => handleDelete(field.id)}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-error hover:bg-error/10 transition">
                        Sí
                      </button>
                      <button type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-full px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button"
                        onClick={() => setCustomFieldModal({ open: true, editing: field })}
                        className="rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">
                        Editar
                      </button>
                      <button type="button"
                        onClick={() => setConfirmDeleteId(field.id)}
                        className="rounded-full px-3 py-1.5 text-xs font-medium text-error hover:bg-error/8 transition">
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
