import { useState } from 'react';
import { ClientList } from '../components/ClientList';
import { useClients, useDeleteClient } from '../hooks/useClients';
import { Client } from '../types';

export const ClientsPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useClients(page, search);
  const deleteClientMutation = useDeleteClient();

  const handleEdit = (client: Client) => {
    // Lógica para editar (puede abrir un modal o navegar)
    console.log('Editar cliente:', client);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await deleteClientMutation.mutateAsync(id);
        alert('Cliente eliminado exitosamente');
      } catch (error) {
        alert('Error al eliminar cliente');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Nuevo Cliente
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full max-w-md"
        />
      </div>

      <ClientList
        clients={data?.results || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {data && data.next && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setPage(page + 1)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Cargar más
          </button>
        </div>
      )}
    </div>
  );
};