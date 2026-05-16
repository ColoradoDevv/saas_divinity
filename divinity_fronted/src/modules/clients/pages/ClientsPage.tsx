import { useState } from 'react';

import {
  md3BodyLargeClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InfoBannerClass,
  md3InputLabelClass,
  md3LabelLargeClass,
  md3OverlineClass,
  md3SuccessBannerClass,
  md3SurfaceClass,
  md3SupportTextClass,
  md3TextFieldClass,
  md3TonalButtonClass,
} from '@/shared/ui/material';

import { ClientList } from '../components/ClientList';
import { useClients, useDeleteClient } from '../hooks/useClients';
import { Client } from '../types';

type FeedbackTone = 'success' | 'info' | 'error';

export const ClientsPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const { data, isLoading } = useClients(page, search);
  const deleteClientMutation = useDeleteClient();

  const handleEdit = (client: Client) => {
    setFeedback({
      tone: 'info',
      message: `La edicion para ${client.name} queda lista para conectarse al siguiente flujo.`,
    });
  };

  const handleDeleteRequest = (id: number) => {
    setConfirmingId(id);
    setFeedback(null);
  };

  const handleDeleteCancel = () => {
    setConfirmingId(null);
  };

  const handleDeleteConfirm = async (id: number) => {
    try {
      await deleteClientMutation.mutateAsync(id);
      setFeedback({
        tone: 'success',
        message: 'Cliente eliminado exitosamente.',
      });
      setConfirmingId(null);
    } catch {
      setFeedback({
        tone: 'error',
        message: 'No se pudo eliminar el cliente. Intenta nuevamente.',
      });
    }
  };

  const feedbackClassName =
    feedback?.tone === 'success'
      ? md3SuccessBannerClass
      : feedback?.tone === 'info'
        ? md3InfoBannerClass
        : 'rounded-[16px] border border-error/20 bg-error-container px-4 py-3 text-sm leading-5 tracking-[0.016rem] text-on-error-container';

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className={md3OverlineClass}>Relationships</span>
            <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>Clientes</h1>
            <p className={`mt-2 text-on-surface-variant ${md3BodyLargeClass}`}>
              Administra tu libreta de clientes con una superficie y acciones consistentes con
              Material 3.
            </p>
          </div>

          <button type="button" className={md3FilledButtonClass}>
            Nuevo cliente
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label htmlFor="client-search" className={md3InputLabelClass}>
              Buscar clientes
            </label>
            <input
              id="client-search"
              type="text"
              placeholder="Nombre o correo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={md3TextFieldClass}
            />
            <p className={md3SupportTextClass}>
              Filtra rapidamente por nombre o direccion de correo.
            </p>
          </div>

          <div className="flex justify-start lg:justify-end">
            <span
              className={`inline-flex h-10 items-center rounded-full bg-secondary-container px-4 text-on-secondary-container ${md3LabelLargeClass}`}
            >
              {data?.count ?? 0} registrados
            </span>
          </div>
        </div>
      </section>

      {feedback && <div className={feedbackClassName}>{feedback.message}</div>}

      <ClientList
        clients={data?.results || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDeleteRequest={handleDeleteRequest}
        onDeleteCancel={handleDeleteCancel}
        onDeleteConfirm={handleDeleteConfirm}
        confirmingId={confirmingId}
      />

      {data && data.next && (
        <div className="flex justify-center">
          <button onClick={() => setPage(page + 1)} className={md3TonalButtonClass}>
            Cargar mas
          </button>
        </div>
      )}
    </div>
  );
};
