export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface UpdateClientData extends Partial<CreateClientData> {
  id: number;
}