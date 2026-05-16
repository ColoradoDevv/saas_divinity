export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateClientData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export interface UpdateClientData {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}