import { useState } from 'react';

import {
  md3BodyMediumClass,
  md3BodySmallClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3SurfaceHighClass,
  md3TextFieldClass,
  md3TitleMediumClass,
  md3TonalButtonClass,
} from '@/shared/ui/material';

import { useAuditLogs } from '../hooks/useAuditLogs';

export const AuditPage = () => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [model, setModel] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useAuditLogs({
    page,
    action: action || undefined,
    model: model || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const handleFilter = () => setPage(1);

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Seguridad</span>
        <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>Logs de Auditoría</h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={md3InputLabelClass}>Acción</label>
            <input
              type="text"
              placeholder="ej. create, delete"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className={md3TextFieldClass}
            />
          </div>
          <div>
            <label className={md3InputLabelClass}>Modelo</label>
            <input
              type="text"
              placeholder="ej. ClientModel"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={md3TextFieldClass}
            />
          </div>
          <div>
            <label className={md3InputLabelClass}>Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={md3TextFieldClass}
            />
          </div>
          <div>
            <label className={md3InputLabelClass}>Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={md3TextFieldClass}
            />
          </div>
        </div>

        <div className="mt-4">
          <button type="button" onClick={handleFilter} className={md3TonalButtonClass}>
            Filtrar
          </button>
        </div>
      </section>

      <section className={`${md3SurfaceHighClass} overflow-hidden`}>
        {isLoading ? (
          <div className="px-6 py-8 text-center">
            <p className={`${md3BodyMediumClass} text-on-surface-variant`}>Cargando logs...</p>
          </div>
        ) : !data?.results.length ? (
          <div className="px-6 py-8 text-center">
            <p className={md3TitleMediumClass}>Sin registros</p>
            <p className={`mt-2 text-on-surface-variant ${md3BodyMediumClass}`}>
              No se encontraron logs con los filtros actuales.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/70 bg-surface-container">
                  <th className={`px-4 py-3 ${md3BodySmallClass} text-on-surface-variant`}>Timestamp</th>
                  <th className={`px-4 py-3 ${md3BodySmallClass} text-on-surface-variant`}>Usuario</th>
                  <th className={`px-4 py-3 ${md3BodySmallClass} text-on-surface-variant`}>Organización</th>
                  <th className={`px-4 py-3 ${md3BodySmallClass} text-on-surface-variant`}>Acción</th>
                  <th className={`px-4 py-3 ${md3BodySmallClass} text-on-surface-variant`}>Modelo</th>
                  <th className={`px-4 py-3 ${md3BodySmallClass} text-on-surface-variant`}>ID Objeto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {data.results.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container/40">
                    <td className={`px-4 py-3 ${md3BodySmallClass} text-on-surface-variant whitespace-nowrap`}>
                      {new Date(log.timestamp).toLocaleString('es-MX')}
                    </td>
                    <td className={`px-4 py-3 ${md3BodySmallClass} text-on-surface`}>
                      {log.user_email ?? '—'}
                    </td>
                    <td className={`px-4 py-3 ${md3BodySmallClass} text-on-surface`}>
                      {log.organization_name ?? '—'}
                    </td>
                    <td className={`px-4 py-3 ${md3BodySmallClass}`}>
                      <span className="rounded-full bg-secondary-container px-2 py-0.5 text-on-secondary-container">
                        {log.action}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${md3BodySmallClass} text-on-surface`}>
                      {log.model_name}
                    </td>
                    <td className={`px-4 py-3 ${md3BodySmallClass} text-on-surface-variant font-mono`}>
                      {log.object_id || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data?.next && (
        <div className="flex justify-center">
          <button onClick={() => setPage(page + 1)} className={md3TonalButtonClass}>
            Cargar más
          </button>
        </div>
      )}
    </div>
  );
};
