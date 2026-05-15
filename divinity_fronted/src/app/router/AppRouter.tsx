import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { PrivateRoute } from '@/modules/auth/components/PrivateRoute';
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { ClientsPage } from '@/modules/clients/pages/ClientsPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
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
        <span className={md3OverlineClass}>Protected module</span>
        <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>{title}</h1>
        <p className={`mt-3 max-w-2xl text-on-surface-variant ${md3BodyLargeClass}`}>
          This destination is already protected behind authentication and ready for the next
          workflow.
        </p>
      </div>
      <span
        className={`inline-flex rounded-full bg-secondary-container px-4 py-2 text-on-secondary-container ${md3LabelLargeClass}`}
      >
        Coming soon
      </span>
    </div>
    <p className={`mt-6 text-on-surface-variant ${md3BodyMediumClass}`}>
      When you are ready, we can turn this placeholder into a full Material 3 feature surface too.
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

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/payments" element={<PlaceholderPage title="Payments" />} />
          <Route path="/attendance" element={<PlaceholderPage title="Attendance" />} />
          <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
