import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';

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
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <span className="eyebrow">Divinity SaaS</span>
          <h2 className="sidebar-title">Secure workspace</h2>
          <p className="sidebar-copy">
            JWT session active for <strong>{user?.username ?? 'unknown user'}</strong>.
          </p>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="ghost-button" onClick={handleLogout}>
          Sign out
        </button>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">Authenticated user</span>
            <h1>Welcome back{user?.first_name ? `, ${user.first_name}` : ''}</h1>
          </div>
          <div className="user-badge">
            <span>{user?.email || 'No email set'}</span>
          </div>
        </header>

        <main className="content-grid">{children}</main>
      </div>
    </div>
  );
};
