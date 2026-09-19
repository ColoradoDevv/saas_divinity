import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { resolveMediaUrl } from '@/shared/utils/media';

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
  </svg>
);

const PaymentsIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M3 10.5h18" />
    <path d="M7 14.5h4" />
  </svg>
);

const ClassesIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
    <path d="M8 3.5v4M16 3.5v4M3.5 10.5h17" />
    <circle cx="8.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

const QRIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 8V5.5A2 2 0 0 1 5.5 3.5H8" />
    <path d="M16 3.5h2.5a2 2 0 0 1 2 2V8" />
    <path d="M20.5 16v2.5a2 2 0 0 1-2 2H16" />
    <path d="M8 20.5H5.5a2 2 0 0 1-2-2V16" />
    <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const TAB_ITEMS = [
  { to: '/portal', label: 'Inicio', end: true, Icon: HomeIcon },
  { to: '/portal/payments', label: 'Pagos', end: false, Icon: PaymentsIcon },
  { to: '/portal/classes', label: 'Clases', end: false, Icon: ClassesIcon },
  { to: '/portal/qr', label: 'Mi QR', end: false, Icon: QRIcon },
];

export const PortalLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const member = useMemberPortalAuthStore((s) => s.member);
  const clearSession = useMemberPortalAuthStore((s) => s.clearSession);

  const handleLogout = () => {
    clearSession();
    navigate('/portal/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 mx-auto w-full max-w-md border-b border-outline-variant/60 bg-surface/85 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {member?.organization_logo_url ? (
              <img
                src={resolveMediaUrl(member.organization_logo_url)}
                alt={member.organization_name}
                className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                {member?.organization_name?.slice(0, 1) ?? '?'}
              </span>
            )}
            <p className="truncate text-sm font-semibold text-on-surface">{member?.organization_name}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-on-surface/8 active:scale-95"
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md space-y-5 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5">
        {children}
      </main>

      <nav
        aria-label="Navegación del portal"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-outline-variant/60 bg-surface/90 backdrop-blur-md"
      >
        <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {TAB_ITEMS.map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition active:scale-95 ${
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  <span className={`text-[10.5px] tracking-[0.01em] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
