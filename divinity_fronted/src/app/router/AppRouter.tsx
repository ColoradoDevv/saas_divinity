import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { useOrgStore, applyOrgColor } from '@/app/store/org';
import { useThemeStore } from '@/app/store/theme';
import { AdminRoute } from '@/modules/auth/components/AdminRoute';
import { PrivateRoute } from '@/modules/auth/components/PrivateRoute';
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { AdminDashboardPage } from '@/modules/admin/pages/AdminDashboardPage';
import { AdminOrganizationsPage } from '@/modules/admin/pages/AdminOrganizationsPage';
import { AdminPaymentsPage } from '@/modules/admin/pages/AdminPaymentsPage';
import { AdminSystemPage } from '@/modules/admin/pages/AdminSystemPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { MemberDetailPage } from '@/modules/members/pages/MemberDetailPage';
import { MembersPage } from '@/modules/members/pages/MembersPage';
import { MemberSettingsPage } from '@/modules/members/pages/MemberSettingsPage';
import { OnboardingPage } from '@/modules/onboarding/pages/OnboardingPage';
import { WorkersPage } from '@/modules/workers/pages/WorkersPage';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { DashboardLayout } from '@/shared/layouts/DashboardLayout';
import {
  md3BodyLargeClass,
  md3BodyMediumClass,
  md3HeadlineSmallClass,
  md3LabelLargeClass,
  md3OverlineClass,
  md3SurfaceClass,
} from '@/shared/ui/material';

const PlaceholderPage = ({ title }: { title: string }) => (
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

const ProtectedLayout = () => (
  <PrivateRoute>
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  </PrivateRoute>
);

const AdminProtectedLayout = () => (
  <AdminRoute>
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  </AdminRoute>
);

export const AppRouter = () => {
  const isDark = useThemeStore((state) => state.isDark);
  const organization = useOrgStore((state) => state.organization);

  // Sincronizar clase dark
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Aplicar color primario de la organización al rehidratar
  useEffect(() => {
    applyOrgColor(organization?.primary_color);
  }, [organization?.primary_color]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Rutas del superadmin */}
        <Route element={<AdminProtectedLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/organizations" element={<AdminOrganizationsPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/system" element={<AdminSystemPage />} />
        </Route>

        {/* Rutas protegidas de usuario */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/super" element={<Navigate to="/admin" replace />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/settings/members" element={<MemberSettingsPage />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/payments" element={<PlaceholderPage title="Pagos" />} />
          <Route path="/attendance" element={<PlaceholderPage title="Asistencia" />} />
          <Route path="/reports" element={<PlaceholderPage title="Reportes" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
