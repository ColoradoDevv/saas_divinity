import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import {
  md3BodyMediumClass,
  md3HeadlineSmallClass,
  md3LabelLargeClass,
  md3LabelMediumClass,
  md3NavItemClass,
  md3PageClass,
  md3TextButtonClass,
  md3TitleLargeClass,
} from '@/shared/ui/material';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/payments', label: 'Payments' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/reports', label: 'Reports' },
];

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-on-background lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-outline-variant bg-surface lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col px-4 py-6">
          <div className="rounded-[28px] bg-primary-container px-5 py-5 text-on-primary-container">
            <span className="text-[0.6875rem] leading-4 font-medium tracking-[0.03125rem] uppercase">
              Divinity SaaS
            </span>
            <h2 className={`mt-3 ${md3TitleLargeClass}`}>Secure workspace</h2>
            <p className={`mt-2 max-w-xs text-on-primary-container/80 ${md3BodyMediumClass}`}>
              JWT session active for <strong>{user?.username ?? 'unknown user'}</strong>.
            </p>
          </div>

          <nav className="mt-6 space-y-1" aria-label="Primary navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `${md3NavItemClass(isActive)} ${md3LabelLargeClass}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-[16px] bg-surface-container px-4 py-4">
            <p className={`text-on-surface-variant ${md3LabelMediumClass}`}>Signed in as</p>
            <p className={`mt-1 truncate ${md3BodyMediumClass}`}>{user?.email || 'No email set'}</p>
            <button type="button" className={`mt-3 ${md3TextButtonClass}`} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-outline-variant bg-surface/95 backdrop-blur-sm">
          <div className={`${md3PageClass} gap-4 py-5`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-primary ${md3LabelMediumClass}`}>Authenticated user</p>
                <h1 className={`mt-1 ${md3HeadlineSmallClass}`}>
                  Welcome back{user?.first_name ? `, ${user.first_name}` : ''}
                </h1>
              </div>
              <div className="rounded-full bg-surface-container-high px-4 py-2 text-on-surface-variant">
                <span className={md3BodyMediumClass}>{user?.email || 'No email set'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className={md3PageClass}>{children}</main>
      </div>
    </div>
  );
};
