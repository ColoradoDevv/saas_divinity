import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import { useToast } from '@/shared/hooks/useToast';
import { CURRENCY_OPTIONS } from '@/shared/utils/currency';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import { useUpdateOrganizationSettings } from '../hooks/useOrganizationSettings';

export const OrganizationSettingsPage = () => {
  const navigate = useNavigate();
  const role = useOrgStore((state) => state.role);
  const organization = useOrgStore((state) => state.organization);
  const updateSettings = useUpdateOrganizationSettings();
  const showToast = useToast();

  const [currency, setCurrency] = useState(organization?.currency ?? 'COP');

  useEffect(() => {
    if (role && role !== 'admin') navigate('/dashboard', { replace: true });
  }, [role, navigate]);

  useEffect(() => {
    if (organization?.currency) setCurrency(organization.currency);
  }, [organization?.currency]);

  if (role && role !== 'admin') return null;

  const handleSave = async () => {
    await updateSettings.mutateAsync({ currency });
    showToast('Cambios guardados.');
  };

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Configuración</span>
        <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>Configuración general</h1>
        <p className={`mt-2 max-w-2xl text-on-surface-variant ${md3BodyMediumClass}`}>
          Ajustes generales de tu empresa.
        </p>
      </section>

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <h2 className={`mb-4 ${md3TitleMediumClass}`}>Moneda</h2>
        <p className={`mb-4 max-w-xl text-on-surface-variant ${md3BodyMediumClass}`}>
          La moneda en la que se muestran los precios de los planes, las cuotas y los reportes en toda la app.
        </p>

        <div className="max-w-xs">
          <label className={md3InputLabelClass}>Moneda</label>
          <select
            className={`${md3TextFieldClass} appearance-none`}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className={md3FilledButtonClass}
          >
            {updateSettings.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </section>
    </div>
  );
};
