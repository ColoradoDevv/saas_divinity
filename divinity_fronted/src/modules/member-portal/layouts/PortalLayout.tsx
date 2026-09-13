import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { md3OverlineClass } from '@/shared/ui/material';
import { resolveMediaUrl } from '@/shared/utils/media';

const NAV_ITEMS = [
  { to: '/portal', label: 'Inicio', end: true },
  { to: '/portal/payments', label: 'Pagos', end: false },
  { to: '/portal/classes', label: 'Clases', end: false },
  { to: '/portal/qr', label: 'Mi QR', end: false },
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
      <header className="sticky top-0 z-30 border-b border-outline-variant/60 bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {member?.organization_logo_url ? (
              <img
                src={resolveMediaUrl(member.organization_logo_url)}
                alt={member.organization_name}
                className="h-8 w-8 flex-shrink-0 object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <p className={md3OverlineClass}>Portal del miembro</p>
              <p className="truncate text-sm font-semibold text-on-surface">{member?.organization_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-on-surface/8"
          >
            Salir
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6" aria-label="Navegación del portal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-on-surface/8'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
};
