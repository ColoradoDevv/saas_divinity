import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
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
import { AttendancePage } from '@/modules/attendance/pages/AttendancePage';
import { DeviceSettingsPage } from '@/modules/attendance/pages/DeviceSettingsPage';
import { AuditPage } from '@/modules/audit/pages/AuditPage';
import { BillingPage } from '@/modules/billing/pages/BillingPage';
import { PlansSettingsPage } from '@/modules/billing/pages/PlansSettingsPage';
import { ClassesPage } from '@/modules/classes/pages/ClassesPage';
import { ClassSettingsPage } from '@/modules/classes/pages/ClassSettingsPage';
import { PortalRoute } from '@/modules/member-portal/components/PortalRoute';
import { PortalLayout } from '@/modules/member-portal/layouts/PortalLayout';
import { PortalActivatePage } from '@/modules/member-portal/pages/PortalActivatePage';
import { PortalClassesPage } from '@/modules/member-portal/pages/PortalClassesPage';
import { PortalHomePage } from '@/modules/member-portal/pages/PortalHomePage';
import { PortalLoginPage } from '@/modules/member-portal/pages/PortalLoginPage';
import { PortalPaymentsPage } from '@/modules/member-portal/pages/PortalPaymentsPage';
import { PortalQRPage } from '@/modules/member-portal/pages/PortalQRPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { MemberDetailPage } from '@/modules/members/pages/MemberDetailPage';
import { MembersPage } from '@/modules/members/pages/MembersPage';
import { MemberSettingsPage } from '@/modules/members/pages/MemberSettingsPage';
import { OnboardingPage } from '@/modules/onboarding/pages/OnboardingPage';
import { OrganizationSettingsPage } from '@/modules/organizations/pages/OrganizationSettingsPage';
import { ReportsPage } from '@/modules/reports/pages/ReportsPage';
import { WorkersPage } from '@/modules/workers/pages/WorkersPage';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { DashboardLayout } from '@/shared/layouts/DashboardLayout';
import { ToastContainer } from '@/shared/components/ToastContainer';
import { resolveMediaUrl } from '@/shared/utils/media';

const ProtectedLayout = () => (
  <PrivateRoute>
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  </PrivateRoute>
);

/** Guard para rutas visibles solo a is_staff o role=admin. */
const AdminOrStaffRoute = ({ children }: { children: ReactNode }) => {
  const user = useAuthStore((state) => state.user);
  const role = useOrgStore((state) => state.role);
  if (!user?.is_staff && role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

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

  // Favicon y título dinámicos: usa el logo y nombre de la org cuando están disponibles
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    if (organization?.logo_url) {
      link.href = resolveMediaUrl(organization.logo_url);
      link.type = 'image/png';
    } else {
      link.href = '/favicon.svg';
      link.type = 'image/svg+xml';
    }
  }, [organization?.logo_url]);

  useEffect(() => {
    document.title = organization?.name
      ? `${organization.name} — Divinity`
      : 'Divinity Business Suite';
  }, [organization?.name]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Portal del miembro — experiencia separada del dashboard de staff */}
        <Route path="/portal/login" element={<PortalLoginPage />} />
        <Route path="/portal/activate/:token" element={<PortalActivatePage />} />
        <Route
          path="/portal"
          element={
            <PortalRoute>
              <PortalLayout>
                <PortalHomePage />
              </PortalLayout>
            </PortalRoute>
          }
        />
        <Route
          path="/portal/payments"
          element={
            <PortalRoute>
              <PortalLayout>
                <PortalPaymentsPage />
              </PortalLayout>
            </PortalRoute>
          }
        />
        <Route
          path="/portal/classes"
          element={
            <PortalRoute>
              <PortalLayout>
                <PortalClassesPage />
              </PortalLayout>
            </PortalRoute>
          }
        />
        <Route
          path="/portal/qr"
          element={
            <PortalRoute>
              <PortalLayout>
                <PortalQRPage />
              </PortalLayout>
            </PortalRoute>
          }
        />

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
          <Route path="/settings/plans" element={<PlansSettingsPage />} />
          <Route path="/settings/organization" element={<OrganizationSettingsPage />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/payments" element={<BillingPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/settings/devices" element={<DeviceSettingsPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/settings/classes" element={<ClassSettingsPage />} />
          <Route
            path="/audit"
            element={
              <AdminOrStaffRoute>
                <AuditPage />
              </AdminOrStaffRoute>
            }
          />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
