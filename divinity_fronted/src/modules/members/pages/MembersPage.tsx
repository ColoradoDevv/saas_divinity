import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3LabelLargeClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
} from '@/shared/ui/material';
import { MemberFormModal } from '../components/MemberFormModal';
import { useDeactivateMember, useMembers } from '../hooks/useMembers';
import type { Member, MemberStatus } from '../types';

const STATUS_CONFIG: Record<MemberStatus, { label: string; cls: string }> = {
  active:    { label: 'Activo',     cls: 'bg-tertiary-container text-on-tertiary-container' },
  inactive:  { label: 'Inactivo',   cls: 'bg-surface-container text-on-surface-variant' },
  suspended: { label: 'Suspendido', cls: 'bg-error-container text-on-error-container' },
};

const StatusBadge = ({ status }: { status: MemberStatus }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

export const MembersPage = () => {
  const navigate = useNavigate();
  const role = useOrgStore((state) => state.role);
  const isAdmin = role === 'admin';
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<number | null>(null);

  const { data, isLoading } = useMembers(page, search, statusFilter);
  const deactivate = useDeactivateMember();

  const members = data?.results ?? [];
  const total = data?.count ?? 0;
  const hasMore = members.length < total;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleDeactivate = async (id: number) => {
    await deactivate.mutateAsync(id);
    setConfirmDeactivateId(null);
  };

  return (
    <div className="space-y-6">
      {(showForm || editingMember) && (
        <MemberFormModal
          editing={editingMember}
          onClose={() => { setShowForm(false); setEditingMember(null); }}
        />
      )}

      {/* Header */}
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className={md3OverlineClass}>Gestión</span>
            <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>Miembros</h1>
            <p className={`mt-2 text-on-surface-variant ${md3BodyMediumClass}`}>
              {total} miembro{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdminOrManager && (
            <button type="button" onClick={() => setShowForm(true)} className={md3FilledButtonClass}>
              + Nuevo miembro
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="member-search" className={md3InputLabelClass}>Buscar</label>
            <input
              id="member-search"
              type="text"
              placeholder="Nombre o correo electrónico"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={md3TextFieldClass}
            />
          </div>
          <div>
            <label htmlFor="status-filter" className={md3InputLabelClass}>Estado</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`${md3TextFieldClass} appearance-none`}
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className={`${md3SurfaceClass} overflow-hidden`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center">
            <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
              {search || statusFilter
                ? 'No hay miembros que coincidan con los filtros.'
                : 'Aún no hay miembros. Crea el primero.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="px-6 py-3.5 text-left font-semibold text-on-surface-variant">Nombre</th>
                  <th className="px-6 py-3.5 text-left font-semibold text-on-surface-variant">Correo</th>
                  <th className="hidden px-6 py-3.5 text-left font-semibold text-on-surface-variant sm:table-cell">Teléfono</th>
                  <th className="px-6 py-3.5 text-left font-semibold text-on-surface-variant">Estado</th>
                  <th className="hidden px-6 py-3.5 text-left font-semibold text-on-surface-variant lg:table-cell">Ingreso</th>
                  <th className="px-6 py-3.5 text-right font-semibold text-on-surface-variant">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-on-surface/4 transition">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/members/${member.id}`)}
                        className={`font-medium text-primary hover:underline ${md3LabelLargeClass}`}
                      >
                        {member.full_name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{member.email}</td>
                    <td className="hidden px-6 py-4 text-on-surface-variant sm:table-cell">
                      {member.phone || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="hidden px-6 py-4 text-on-surface-variant lg:table-cell">
                      {member.created_at
                        ? new Date(member.created_at).toLocaleDateString('es')
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {isAdminOrManager && (
                          <button type="button"
                            onClick={() => setEditingMember(member)}
                            className="rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">
                            Editar
                          </button>
                        )}
                        {isAdmin && member.status === 'active' && (
                          confirmDeactivateId === member.id ? (
                            <>
                              <span className={`text-error ${md3BodyMediumClass}`}>¿Desactivar?</span>
                              <button type="button"
                                onClick={() => handleDeactivate(member.id)}
                                className="rounded-full px-3 py-1 text-xs font-semibold text-error hover:bg-error/10 transition">
                                Sí
                              </button>
                              <button type="button"
                                onClick={() => setConfirmDeactivateId(null)}
                                className="rounded-full px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">
                                No
                              </button>
                            </>
                          ) : (
                            <button type="button"
                              onClick={() => setConfirmDeactivateId(member.id)}
                              className="rounded-full px-3 py-1.5 text-xs font-medium text-error hover:bg-error/8 transition">
                              Desactivar
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center border-t border-outline-variant p-4">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-outline-variant px-6 py-2 text-sm font-medium text-on-surface-variant hover:bg-on-surface/8 transition"
            >
              Cargar más
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
