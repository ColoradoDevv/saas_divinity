import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import isotipoBlanco from '@/assets/images/brand/isotipo-blanco.svg';
import isotipoColor from '@/assets/images/brand/isotipo-color.svg';
import { useAuthStore } from '@/app/store/auth';
import { useOrgStore } from '@/app/store/org';
import { useThemeStore } from '@/app/store/theme';
import { md3PageClass } from '@/shared/ui/material';

// ─── Icons ────────────────────────────────────────────────────────────────────

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ─── Nav Icons ────────────────────────────────────────────────────────────────

const NavIcons = {
  dashboard: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  organizations: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  ),
  payments: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  system: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

// ─── Nav config ───────────────────────────────────────────────────────────────

const ADMIN_NAV = [
  {
    section: 'Resumen',
    items: [{ to: '/admin', label: 'Dashboard', icon: 'dashboard' as const, exact: true }],
  },
  {
    section: 'Gestión',
    items: [
      { to: '/admin/organizations', label: 'Empresas', icon: 'organizations' as const, exact: false },
      { to: '/admin/payments', label: 'Pagos', icon: 'payments' as const, exact: false },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { to: '/admin/system', label: 'Sistema', icon: 'system' as const, exact: false },
    ],
  },
];

const getInitials = (firstName?: string, lastName?: string, username?: string) => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (username) return username[0].toUpperCase();
  return '?';
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarContentProps {
  onClose?: () => void;
}

const AdminSidebarContent = ({ onClose }: SidebarContentProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearOrganization = useOrgStore((state) => state.clearOrganization);
  const isDark = useThemeStore((state) => state.isDark);

  const handleLogout = () => {
    clearOrganization();
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col">

      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <img
            src={isDark ? isotipoBlanco : isotipoColor}
            alt="Divinity"
            className="h-9 w-9 flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-on-surface">
              Divinity
            </p>
            <p className="mt-0.5 text-[11px] font-medium leading-none tracking-wide text-on-surface-variant">
              Sistema Central
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-full p-1.5 text-on-surface-variant transition hover:bg-on-surface/8 lg:hidden"
            aria-label="Cerrar menú"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Super Admin badge */}
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-[12px] border border-error/20 bg-error-container/40 px-3 py-2">
        <span className="text-on-error-container"><ShieldIcon /></span>
        <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-on-error-container">
          Super Admin
        </span>
      </div>

      <div className="mx-4 h-px bg-outline-variant/60" />

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Navegación del sistema">
        {ADMIN_NAV.map(({ section, items }) => (
          <div key={section} className="mb-1">
            <p className="mx-2 mb-1 mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/70">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map(({ to, label, icon, exact }) => {
                const Icon = NavIcons[icon];
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-full px-4 py-[0.6875rem] text-[0.8125rem] font-medium tracking-[0.006rem] transition ${
                        isActive
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface'
                      }`
                    }
                  >
                    <Icon />
                    {label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="mx-3 mb-4 mt-2 rounded-[20px] border border-outline-variant/50 bg-surface-container px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-error text-sm font-semibold text-on-error shadow-sm">
            {getInitials(user?.first_name, user?.last_name, user?.username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-medium leading-tight text-on-surface">
              {user?.first_name
                ? `${user.first_name} ${user.last_name ?? ''}`.trim()
                : (user?.username ?? 'Admin')}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
              {user?.email ?? ''}
            </p>
          </div>
        </div>

        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-error/20 bg-error-container/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-on-error-container">
          <ShieldIcon />
          Super Administrador
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-full px-3 py-2 text-[0.8125rem] font-medium text-error transition hover:bg-error/8"
        >
          <LogoutIcon />
          Cerrar sesión
        </button>
      </div>

    </div>
  );
};

// ─── Main Layout ──────────────────────────────────────────────────────────────

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggle);

  const dateStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] border-r border-outline-variant bg-surface lg:flex lg:flex-col">
        <AdminSidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[17.5rem] border-r border-outline-variant bg-surface transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Menú de navegación admin"
        aria-hidden={!sidebarOpen}
      >
        <AdminSidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Content area */}
      <div className="min-h-screen lg:pl-[17.5rem]">

        {/* Top header */}
        <header className="sticky top-0 z-10 border-b border-error/20 bg-surface/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex-shrink-0 rounded-full p-2 text-on-surface-variant transition hover:bg-on-surface/8 lg:hidden"
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-error">
                  Panel de Sistema
                </p>
                <span className="hidden rounded-full border border-error/30 bg-error-container/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-error-container sm:inline-flex">
                  Super Admin
                </span>
              </div>
              <h1 className="capitalize text-base font-semibold leading-tight text-on-surface sm:text-lg">
                {dateStr}
              </h1>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex-shrink-0 rounded-full p-2 text-on-surface-variant transition hover:bg-on-surface/8 hover:text-on-surface"
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            <div className="hidden flex-shrink-0 items-center gap-2.5 rounded-full border border-error/30 bg-error-container/30 px-3 py-2 sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error text-[10px] font-semibold text-on-error">
                {getInitials(user?.first_name, user?.last_name, user?.username)}
              </div>
              <span className="max-w-[12rem] truncate text-[0.8125rem] font-medium text-on-surface">
                {user?.email ?? ''}
              </span>
              <span className="text-on-error-container"><ShieldIcon /></span>
            </div>

          </div>
        </header>

        <main className={md3PageClass}>
          {children}
        </main>

      </div>
    </div>
  );
};
