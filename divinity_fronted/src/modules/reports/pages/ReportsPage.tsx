import { useMemo, useState } from 'react';

import { useOrgStore } from '@/app/store/org';
import { useAttendanceByWeekday } from '@/modules/attendance/hooks/useAttendance';
import { SUBSCRIPTION_STATUS_CONFIG } from '@/modules/billing/constants';
import {
  useDailyStats,
  useDownloadReportExport,
  useMembershipStatusReport,
  useRevenueByMonth,
} from '@/modules/billing/hooks/useBilling';
import type { ReportExportFormat } from '@/modules/billing/types';
import { BarChart } from '@/shared/components/BarChart';
import { PlaceholderPage } from '@/shared/components/PlaceholderPage';
import { ScrollableTableWrapper } from '@/shared/components/ScrollableTableWrapper';
import { useCurrencyFormatter } from '@/shared/hooks/useCurrencyFormatter';
import { useToast } from '@/shared/hooks/useToast';
import { getApiErrorMessageAsync } from '@/shared/utils/apiError';
import { toISODate } from '@/shared/utils/date';
import { downloadBlob } from '@/shared/utils/download';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineMediumClass,
  md3InputLabelClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

const formatMonth = (yyyyMm: string): string => {
  const [, month] = yyyyMm.split('-');
  return MONTH_LABELS[month] ?? yyyyMm;
};

const defaultDateTo = () => toISODate(new Date());
const defaultDateFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return toISODate(d);
};

const HISTORY_PAGE_SIZE = 5;

const DailyHistorySection = () => {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [page, setPage] = useState(1);
  const { data: dailyStats = [], isLoading } = useDailyStats(dateFrom, dateTo);
  const downloadExport = useDownloadReportExport();
  const formatMoney = useCurrencyFormatter();
  const showToast = useToast();

  // Más reciente primero; se pagina de a HISTORY_PAGE_SIZE en vez de listar
  // hasta 366 filas de una — el rango de fechas puede llegar a cubrir un año.
  const sortedStats = useMemo(() => [...dailyStats].reverse(), [dailyStats]);
  const totalPages = Math.max(1, Math.ceil(sortedStats.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedStats.slice(
    (currentPage - 1) * HISTORY_PAGE_SIZE,
    currentPage * HISTORY_PAGE_SIZE,
  );

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };
  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPage(1);
  };

  const handleDownload = async (exportFormat: ReportExportFormat) => {
    try {
      const blob = await downloadExport.mutateAsync({ exportFormat, dateFrom, dateTo });
      downloadBlob(blob, `reporte-${dateFrom}_a_${dateTo}.${exportFormat}`);
      showToast('Descarga lista.');
    } catch (err) {
      showToast(await getApiErrorMessageAsync(err, 'No se pudo generar la descarga. Intenta de nuevo.'), 'error');
    }
  };

  return (
    <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={md3TitleMediumClass}>Histórico diario</h2>
          <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
            Ingresos, check-ins y miembros nuevos por día.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={md3InputLabelClass}>Desde</label>
            <input type="date" className={md3TextFieldClass} value={dateFrom}
              max={dateTo} onChange={(e) => handleDateFromChange(e.target.value)} />
          </div>
          <div>
            <label className={md3InputLabelClass}>Hasta</label>
            <input type="date" className={md3TextFieldClass} value={dateTo}
              min={dateFrom} max={defaultDateTo()} onChange={(e) => handleDateToChange(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <button type="button" className={md3OutlinedButtonClass}
          disabled={downloadExport.isPending} onClick={() => handleDownload('xlsx')}>
          {downloadExport.isPending ? 'Generando...' : 'Descargar Excel'}
        </button>
        <button type="button" className={md3FilledButtonClass}
          disabled={downloadExport.isPending} onClick={() => handleDownload('pdf')}>
          {downloadExport.isPending ? 'Generando...' : 'Descargar PDF'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        </div>
      ) : dailyStats.length === 0 ? (
        <p className={`py-8 text-center text-on-surface-variant ${md3BodyMediumClass}`}>
          No hay datos en el rango seleccionado.
        </p>
      ) : (
        <>
          <ScrollableTableWrapper className="rounded-[16px] border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">Fecha</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface-variant">Ingresos</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface-variant">Check-ins</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface-variant">Miembros nuevos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {pageRows.map((row) => (
                  <tr key={row.date} className="hover:bg-on-surface/4 transition">
                    <td className="px-4 py-2.5 text-on-surface">{row.date}</td>
                    <td className="px-4 py-2.5 text-right text-on-surface">{formatMoney(row.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-on-surface-variant">{row.checkins}</td>
                    <td className="px-4 py-2.5 text-right text-on-surface-variant">{row.new_members}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTableWrapper>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button type="button" className={md3OutlinedButtonClass}
                  disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </button>
                <button type="button" className={md3OutlinedButtonClass}
                  disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

const GymReportsPage = () => {
  const { data: revenue = [], isLoading: loadingRevenue } = useRevenueByMonth(6);
  const { data: statusReport, isLoading: loadingStatus } = useMembershipStatusReport();
  const { data: weekday = [], isLoading: loadingWeekday } = useAttendanceByWeekday(30);
  const formatMoney = useCurrencyFormatter();

  const statusTiles = statusReport
    ? (['active', 'frozen', 'expired', 'cancelled'] as const).map((key) => ({
        key,
        count: statusReport[key],
        ...SUBSCRIPTION_STATUS_CONFIG[key],
      }))
    : [];

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Gestión</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Reportes</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Estadísticas del negocio de los últimos meses.
        </p>
      </section>

      <DailyHistorySection />

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <h2 className={`mb-4 ${md3TitleMediumClass}`}>Ingresos por mes</h2>
        {loadingRevenue ? (
          <div className="flex justify-center py-8">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : (
          <BarChart
            data={revenue.map((r) => ({ label: formatMonth(r.month), value: Number(r.total) }))}
            formatValue={formatMoney}
            colorClassName="text-primary"
          />
        )}
      </section>

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <h2 className={`mb-4 ${md3TitleMediumClass}`}>Estado de membresías</h2>
        {loadingStatus ? (
          <div className="flex justify-center py-8">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statusTiles.map((t) => (
              <div key={t.key} className="rounded-2xl border border-outline-variant p-4">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${t.cls}`}>
                  {t.label}
                </span>
                <p className="mt-2 text-2xl font-semibold text-on-surface">{t.count}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <h2 className={`mb-4 ${md3TitleMediumClass}`}>Asistencia por día de la semana (últimos 30 días)</h2>
        {loadingWeekday ? (
          <div className="flex justify-center py-8">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : (
          <BarChart
            data={weekday.map((w) => ({ label: w.label.slice(0, 3), value: w.count }))}
            colorClassName="text-secondary"
          />
        )}
      </section>
    </div>
  );
};

export const ReportsPage = () => {
  const organization = useOrgStore((state) => state.organization);

  if (organization?.business_type !== 'gym') {
    return <PlaceholderPage title="Reportes" />;
  }

  return <GymReportsPage />;
};
