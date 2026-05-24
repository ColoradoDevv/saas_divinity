export interface Worker {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  has_account: boolean;
  is_active: boolean;
  created_at: string;
  task_count: number;
  allowed_modules: string[];
}

export interface GeneratedCredentials {
  username: string;
  password: string;
}

export interface WorkerCreationResponse extends Worker {
  generated_credentials: GeneratedCredentials | null;
}

export interface Task {
  id: number;
  worker_id: number | null;
  worker_name: string | null;
  title: string;
  description: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateWorkerPayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  position: string;
  allowed_modules?: string[];
  create_account?: boolean;
  credential_type?: 'gmail' | 'auto';
  password_type?: 'manual' | 'auto';
  password?: string;
}

export interface CreateTaskPayload {
  worker_id?: number | null;
  title: string;
  description?: string;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateWorkerPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  allowed_modules?: string[];
}

export interface UpdateTaskPayload {
  status?: Task['status'];
  priority?: Task['priority'];
  worker_id?: number | null;
  title?: string;
  description?: string;
  due_date?: string | null;
}
