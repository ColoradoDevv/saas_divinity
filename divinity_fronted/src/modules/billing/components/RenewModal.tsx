import { useEffect, useState } from 'react';

import { useCurrencyFormatter } from '@/shared/hooks/useCurrencyFormatter';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3InputLabelClass,
  md3OutlinedButtonClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import { DURATION_UNIT_LABELS, PAYMENT_METHOD_LABELS } from '../constants';
import { useRenewMembership, usePlans } from '../hooks/useBilling';
import type { PaymentMethod } from '../types';

interface Props {
  memberId: number;
  onClose: () => void;
}

export const RenewModal = ({ memberId, onClose }: Props) => {
  const { data: plans = [] } = usePlans(true);
  const renew = useRenewMembership(memberId);
  const formatMoney = useCurrencyFormatter();

  const [planId, setPlanId] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (plans.length > 0 && planId === null) {
      setPlanId(plans[0].id);
      setAmount(plans[0].price);
    }
  }, [plans, planId]);

  const selectedPlan = plans.find((p) => p.id === planId);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!planId) return;
    setError('');
    try {
      await renew.mutateAsync({ member_id: memberId, plan_id: planId, method, amount: amount || undefined, notes });
      onClose();
    } catch {
      setError('Error al renovar la membresía. Verifica los datos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`${md3SurfaceClass} w-full max-w-md shadow-2xl`}>
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className={md3TitleMediumClass}>Renovar membresía</h3>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-on-surface-variant hover:bg-on-surface/8 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {plans.length === 0 ? (
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              No hay planes activos. Crea uno primero en Configuración → Planes de membresía.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={md3InputLabelClass}>Plan *</label>
                <select className={`${md3TextFieldClass} appearance-none`}
                  value={planId ?? ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setPlanId(id);
                    setAmount(plans.find((p) => p.id === id)?.price ?? '');
                  }}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.price)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={md3InputLabelClass}>Monto cobrado</label>
                  <input type="number" min="0" step="0.01" className={md3TextFieldClass}
                    value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <label className={md3InputLabelClass}>Método de pago</label>
                  <select className={`${md3TextFieldClass} appearance-none`}
                    value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={md3InputLabelClass}>Notas</label>
                <input className={md3TextFieldClass} placeholder="Opcional"
                  value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {selectedPlan && (
                <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                  Vence en {selectedPlan.duration_value} {DURATION_UNIT_LABELS[selectedPlan.duration_unit]} desde hoy.
                </p>
              )}

              {error && <p className={`text-error ${md3BodyMediumClass}`}>{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="submit" className={`${md3FilledButtonClass} flex-1`} disabled={renew.isPending}>
                  {renew.isPending ? 'Guardando...' : 'Confirmar renovación'}
                </button>
                <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
