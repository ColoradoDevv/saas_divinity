import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/app/store/auth';
import { useOrgStore } from '@/app/store/org';
import { useThemeStore } from '@/app/store/theme';
import { md3PageClass } from '@/shared/ui/material';

// ─── Icons ───────────────────────────────────────────────────────────────────

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

const BrandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
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

// ─── Nav icons ────────────────────────────────────────────────────────────────

const NavIcons = {
  '/dashboard': () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  '/clients': () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  '/payments': () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  '/attendance': () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="m9 16 2 2 4-4" />
    </svg>
  ),
  '/reports': () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_NAV = [
  { to: '/dashboard',  label: 'Panel',      module: null },        // siempre visible
  { to: '/clients',    label: 'Clientes',   module: 'clients' },
  { to: '/payments',   label: 'Pagos',      module: 'payments' },
  { to: '/attendance', label: 'Asistencia', module: 'attendance' },
  { to: '/reports',    label: 'Reportes',   module: 'reports' },
];

const getInitials = (firstName?: string, lastName?: string, username?: string) => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (username) return username[0].toUpperCase();
  return '?';
};

// ─── Sidebar content ──────────────────────────────────────────────────────────

interface SidebarContentProps {
  onClose?: () => void;
}

const SidebarContent = ({ onClose }: SidebarContentProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const organization = useOrgStore((state) => state.organization);
  const role = useOrgStore((state) => state.role);
  const clearOrganization = useOrgStore((state) => state.clearOrganization);

  const enabledModules = organization?.enabled_modules ?? [];
  const navigation = ALL_NAV.filter(
    (item) => item.module === null || enabledModules.includes(item.module),
  );

  const handleLogout = () => {
    clearOrganization();
    clearSession();
    navigate('/login', { replace: true });
  };

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    staff: 'Staff',
  };

  return (
    <div className="flex h-full flex-col">

      {/* Brand — muestra nombre de la organización si está disponible */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm">
            <BrandIcon />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-on-surface">
              {organization?.name ?? 'Divinity'}
            </p>
            <p className="mt-0.5 text-[11px] font-medium leading-none tracking-wide text-on-surface-variant">
              {organization ? `Plan ${organization.plan}` : 'Business Suite'}
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

      {/* Divider */}
      <div className="mx-4 h-px bg-outline-variant/60" />

      {/* Navigation label */}
      <p className="mx-5 mt-5 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/70">
        Módulos
      </p>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Navegación principal">
        {navigation.map(({ to, label }) => {
          const Icon = NavIcons[to as keyof typeof NavIcons];
          return (
            <NavLink
              key={to}
              to={to}
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
      </nav>

      {/* User card */}
      <div className="mx-3 mb-4 mt-2 rounded-[20px] border border-outline-variant/50 bg-surface-container px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary shadow-sm">
            {getInitials(user?.first_name, user?.last_name, user?.username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-medium leading-tight text-on-surface">
              {user?.first_name
                ? `${user.first_name} ${user.last_name ?? ''}`.trim()
                : (user?.username ?? 'Usuario')}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
              {user?.email ?? ''}
            </p>
          </div>
        </div>

        {/* Role badge */}
        {role && (
          <div className="mt-2.5 inline-flex items-center rounded-full border border-secondary/20 bg-secondary-container/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-on-secondary-container">
            {roleLabel[role] ?? role}
          </div>
        )}

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

// ─── Main layout ──────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const organization = useOrgStore((state) => state.organization);
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggle);

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

      {/* Desktop sidebar — always visible */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] border-r border-outline-variant bg-surface lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar — slide-over */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[17.5rem] border-r border-outline-variant bg-surface transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Menú de navegación"
        aria-hidden={!sidebarOpen}
      >
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Content area */}
      <div className="min-h-screen lg:pl-[17.5rem]">

        {/* Top header */}
        <header className="sticky top-0 z-10 border-b border-outline-variant bg-surface/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex-shrink-0 rounded-full p-2 text-on-surface-variant transition hover:bg-on-surface/8 lg:hidden"
              aria-label="Abrir menú de navegación"
            >
              <MenuIcon />
            </button>

            {/* Page title */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                {organization?.name ?? 'Divinity Suite'}
              </p>
              <h1 className="text-base font-semibold leading-tight text-on-surface sm:text-lg">
                Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}
              </h1>
            </div>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-shrink-0 rounded-full p-2 text-on-surface-variant transition hover:bg-on-surface/8 hover:text-on-surface"
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* User chip — desktop */}
            <div className="hidden flex-shrink-0 items-center gap-2.5 rounded-full border border-outline-variant bg-surface-container px-3 py-2 sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-on-primary">
                {getInitials(user?.first_name, user?.last_name, user?.username)}
              </div>
              <span className="max-w-[12rem] truncate text-[0.8125rem] font-medium text-on-surface">
                {user?.email ?? ''}
              </span>
            </div>

          </div>
        </header>

        {/* Page content */}
        <main className={md3PageClass}>
          {children}
        </main>

      </div>
    </div>
  );
};
