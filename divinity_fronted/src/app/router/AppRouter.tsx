import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { PrivateRoute } from '@/modules/auth/components/PrivateRoute';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { DashboardLayout } from '@/shared/layouts/DashboardLayout';

const PlaceholderPage = ({ title }: { title: string }) => (
  <section className="panel">
    <span className="eyebrow">Protected module</span>
    <h1>{title}</h1>
    <p>This area is behind JWT authentication and ready for the next functional block.</p>
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
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<PlaceholderPage title="Clients" />} />
          <Route path="/payments" element={<PlaceholderPage title="Payments" />} />
          <Route path="/attendance" element={<PlaceholderPage title="Attendance" />} />
          <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
