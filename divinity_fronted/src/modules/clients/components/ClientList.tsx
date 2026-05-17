import { useOrgStore } from '@/app/store/org';
import {
  md3BodyMediumClass,
  md3BodySmallClass,
  md3DestructiveButtonClass,
  md3LabelLargeClass,
  md3OutlinedButtonClass,
  md3SurfaceHighClass,
  md3TextButtonClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';

import { Client } from '../types';

interface ClientListProps {
  clients: Client[];
  isLoading: boolean;
  onEdit: (client: Client) => void;
  onDeleteRequest: (id: number) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: (id: number) => void;
  confirmingId: number | null;
}

export const ClientList = ({
  clients,
  isLoading,
  onEdit,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
  confirmingId,
}: ClientListProps) => {
  const role = useOrgStore((state) => state.role);
  const isAdmin = role === 'admin';

  if (isLoading) {
    return (
      <section className={`${md3SurfaceHighClass} px-6 py-8 text-center`}>
        <p className={`${md3BodyMediumClass} text-on-surface-variant`}>Cargando clientes...</p>
      </section>
    );
  }

  if (clients.length === 0) {
    return (
      <section className={`${md3SurfaceHighClass} px-6 py-8 text-center`}>
        <p className={md3TitleMediumClass}>No hay clientes registrados.</p>
        <p className={`mt-2 text-on-surface-variant ${md3BodyMediumClass}`}>
          Cuando el modulo reciba datos, apareceran aqui como una lista Material 3.
        </p>
      </section>
    );
  }

  return (
    <section className={`${md3SurfaceHighClass} overflow-hidden`}>
      <div className="border-b border-outline-variant/70 px-6 py-4">
        <p className={`${md3LabelLargeClass} text-on-surface-variant`}>Client records</p>
      </div>

      <ul className="divide-y divide-outline-variant/70">
        {clients.map((client) => {
          const isConfirming = confirmingId === client.id;

          return (
            <li
              key={client.id}
              className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <p className={md3TitleMediumClass}>{client.name}</p>
                <p className={`mt-1 truncate text-on-surface-variant ${md3BodyMediumClass}`}>
                  {client.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full bg-surface-container-highest px-3 py-1 text-on-surface-variant ${md3BodySmallClass}`}
                  >
                    Telefono: {client.phone || 'No registrado'}
                  </span>
                  {client.address && (
                    <span
                      className={`inline-flex rounded-full bg-surface-container-highest px-3 py-1 text-on-surface-variant ${md3BodySmallClass}`}
                    >
                      Direccion: {client.address}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {isConfirming ? (
                  <>
                    <button type="button" className={md3OutlinedButtonClass} onClick={onDeleteCancel}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className={md3DestructiveButtonClass}
                      onClick={() => onDeleteConfirm(client.id)}
                    >
                      Confirmar borrado
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={md3TextButtonClass}
                      onClick={() => onEdit(client)}
                    >
                      Editar
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className={md3TextButtonClass.replace('text-primary', 'text-error').replace(
                          'hover:bg-primary/8',
                          'hover:bg-error/8',
                        )}
                        onClick={() => onDeleteRequest(client.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
