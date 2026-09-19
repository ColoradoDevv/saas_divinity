import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { useCurrencyFormatter } from '@/shared/hooks/useCurrencyFormatter';
import { useToast } from '@/shared/hooks/useToast';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3ModalBackdropClass,
  md3ModalPanelAnimClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import { DURATION_UNIT_LABELS as DURATION_LABELS } from '../constants';
import { useCreatePlan, useDeactivatePlan, usePlans, useUpdatePlan } from '../hooks/useBilling';
import type { CreatePlanData, DurationUnit, Plan } from '../types';

const DEFAULT_FORM: CreatePlanData = {
  name: '', description: '', price: '', duration_value: 1, duration_unit: 'month',
};

// ─── Plan Modal ───────────────────────────────────────────────────────────────

const PlanModal = ({ editing, onClose }: { editing: Plan | null; onClose: () => void }) => {
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const [form, setForm] = useState<CreatePlanData>(
    editing
      ? {
          name: editing.name, description: editing.description, price: editing.price,
          duration_value: editing.duration_value, duration_unit: editing.duration_unit,
        }
      : DEFAULT_FORM
  );
  const [error, setError] = useState('');

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await updatePlan.mutateAsync({ id: editing.id, data: form });
      } else {
        await createPlan.mutateAsync(form);
      }
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al guardar el plan. Verifica que el nombre no esté repetido.'));
    }
  };

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <div className={md3ModalBackdropClass}>
      <div className={`${md3SurfaceClass} ${md3ModalPanelAnimClass} w-full max-w-md shadow-2xl`}>
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className={md3TitleMediumClass}>{editing ? 'Editar plan' : 'Nuevo plan'}</h3>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={md3InputLabelClass}>Nombre *</label>
              <input required className={md3TextFieldClass} placeholder="ej: Mensual"
                value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <label className={md3InputLabelClass}>Descripción</label>
              <input className={md3TextFieldClass} placeholder="Opcional"
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={md3InputLabelClass}>Precio *</label>
                <CurrencyInput required value={form.price}
                  onChange={(v) => setForm((p) => ({ ...p, price: v }))} />
              </div>
              <div>
                <label className={md3InputLabelClass}>Duración</label>
                <div className="flex gap-1.5">
                  <input type="number" min="1" className={`${md3TextFieldClass} w-16`}
                    value={form.duration_value}
                    onChange={(e) => setForm((p) => ({ ...p, duration_value: Number(e.target.value) || 1 }))} />
                  <select className={`${md3TextFieldClass} appearance-none`}
                    value={form.duration_unit}
                    onChange={(e) => setForm((p) => ({ ...p, duration_unit: e.target.value as DurationUnit }))}>
                    {Object.entries(DURATION_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && <p className={`text-error ${md3BodyMediumClass}`}>{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" className={`${md3FilledButtonClass} flex-1`} disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar plan'}
              </button>
              <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const PlansSettingsPage = () => {
  const navigate = useNavigate();
  const role = useOrgStore((state) => state.role);
  const formatMoney = useCurrencyFormatter();

  useEffect(() => {
    if (role && role !== 'admin') navigate('/dashboard', { replace: true });
  }, [role, navigate]);

  const { data: plans = [], isLoading } = usePlans();
  const deactivatePlan = useDeactivatePlan();
  const showToast = useToast();
  const [modal, setModal] = useState<{ open: boolean; editing: Plan | null }>({ open: false, editing: null });
  const [confirmId, setConfirmId] = useState<number | null>(null);

  if (role && role !== 'admin') return null;

  const handleDeactivate = async (id: number) => {
    try {
      await deactivatePlan.mutateAsync(id);
      setConfirmId(null);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'No se pudo desactivar el plan.'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {modal.open && <PlanModal editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />}

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className={md3OverlineClass}>Configuración</span>
            <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>Planes de membresía</h1>
            <p className={`mt-2 max-w-2xl text-on-surface-variant ${md3BodyMediumClass}`}>
              Los planes que ofreces (mensual, trimestral, pase diario...). Se usan al renovar la membresía de un miembro.
            </p>
          </div>
          <button type="button" onClick={() => setModal({ open: true, editing: null })} className={md3FilledButtonClass}>
            + Nuevo plan
          </button>
        </div>
      </section>

      <section className={`${md3SurfaceClass} overflow-hidden`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center">
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Aún no hay planes. Crea el primero.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/40">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-on-surface">{plan.name}</p>
                    {!plan.is_active && (
                      <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-on-surface-variant ${md3BodyMediumClass}`}>
                    {formatMoney(plan.price)} · {plan.duration_value} {DURATION_LABELS[plan.duration_unit]}
                    {plan.description ? ` · ${plan.description}` : ''}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  {confirmId === plan.id ? (
                    <>
                      <span className={`mr-1 text-error ${md3BodyMediumClass}`}>¿Desactivar?</span>
                      <button type="button" onClick={() => handleDeactivate(plan.id)}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-error hover:bg-error/10 transition">Sí</button>
                      <button type="button" onClick={() => setConfirmId(null)}
                        className="rounded-full px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">No</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setModal({ open: true, editing: plan })}
                        className="rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">Editar</button>
                      {plan.is_active && (
                        <button type="button" onClick={() => setConfirmId(plan.id)}
                          className="rounded-full px-3 py-1.5 text-xs font-medium text-error hover:bg-error/8 transition">Desactivar</button>
                      )}
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
