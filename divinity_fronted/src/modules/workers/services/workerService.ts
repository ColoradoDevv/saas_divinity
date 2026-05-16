import { api } from '@/shared/api/api';

import type {
  CreateTaskPayload,
  CreateWorkerPayload,
  Task,
  UpdateTaskPayload,
  Worker,
} from '../types';

export const workerService = {
  async getWorkers(): Promise<Worker[]> {
    const res = await api.get('/workers/');
    return res.data;
  },

  async createWorker(payload: CreateWorkerPayload): Promise<Worker> {
    const res = await api.post('/workers/', payload);
    return res.data;
  },

  async updateWorker(id: number, payload: Partial<CreateWorkerPayload>): Promise<Worker> {
    const res = await api.patch(`/workers/${id}/`, payload);
    return res.data;
  },

  async deleteWorker(id: number): Promise<void> {
    await api.delete(`/workers/${id}/`);
  },

  async getTasks(workerId?: number): Promise<Task[]> {
    const params = workerId ? `?worker_id=${workerId}` : '';
    const res = await api.get(`/workers/tasks/${params}`);
    return res.data;
  },

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const res = await api.post('/workers/tasks/', payload);
    return res.data;
  },

  async updateTask(id: number, payload: UpdateTaskPayload): Promise<Task> {
    const res = await api.patch(`/workers/tasks/${id}/`, payload);
    return res.data;
  },

  async deleteTask(id: number): Promise<void> {
    await api.delete(`/workers/tasks/${id}/`);
  },
};
