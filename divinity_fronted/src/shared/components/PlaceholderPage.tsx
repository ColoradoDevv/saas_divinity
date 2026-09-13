import {
  md3BodyLargeClass,
  md3BodyMediumClass,
  md3HeadlineSmallClass,
  md3LabelLargeClass,
  md3OverlineClass,
  md3SurfaceClass,
} from '@/shared/ui/material';

export const PlaceholderPage = ({ title }: { title: string }) => (
  <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <span className={md3OverlineClass}>Módulo protegido</span>
        <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>{title}</h1>
        <p className={`mt-3 max-w-2xl text-on-surface-variant ${md3BodyLargeClass}`}>
          Este módulo ya está protegido por autenticación y listo para la siguiente fase.
        </p>
      </div>
      <span className={`inline-flex rounded-full bg-secondary-container px-4 py-2 text-on-secondary-container ${md3LabelLargeClass}`}>
        Próximamente
      </span>
    </div>
    <p className={`mt-6 text-on-surface-variant ${md3BodyMediumClass}`}>
      Estará disponible en la siguiente actualización.
    </p>
  </section>
);
