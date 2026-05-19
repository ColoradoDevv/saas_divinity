import { api } from '@/shared/api/api';
import { Client, CreateClientData, UpdateClientData } from '../types';
import { ApiResponse, PaginatedResponse } from '@/shared/types';

export const clientService = {
  async getClients(page = 1, search = ''): Promise<PaginatedResponse<Client>> {
    const response = await api.get(`/clients/?page=${page}&search=${search}`);
    return response.data;
  },

  async getClient(id: number): Promise<Client> {
    const response = await api.get(`/clients/${id}/`);
    return response.data;
  },

  async createClient(data: CreateClientData): Promise<Client> {
    const response = await api.post('/clients/', data);
    return response.data;
  },

  async updateClient(data: UpdateClientData): Promise<Client> {
    const response = await api.put(`/clients/${data.id}/`, data);
    return response.data;
  },

  async deleteClient(id: number): Promise<void> {
    await api.delete(`/clients/${id}/`);
  },
};
