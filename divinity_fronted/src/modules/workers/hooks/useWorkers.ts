import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workerService } from '../services/workerService';
import type { CreateTaskPayload, CreateWorkerPayload, UpdateTaskPayload } from '../types';

export const useWorkers = () =>
  useQuery({ queryKey: ['workers'], queryFn: workerService.getWorkers });

export const useCreateWorker = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkerPayload) => workerService.createWorker(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workers'] }),
  });
};

export const useDeleteWorker = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => workerService.deleteWorker(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workers'] }),
  });
};

export const useTasks = (workerId?: number) =>
  useQuery({
    queryKey: ['tasks', workerId],
    queryFn: () => workerService.getTasks(workerId),
  });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => workerService.createTask(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['workers'] });
    },
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTaskPayload }) =>
      workerService.updateTask(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => workerService.deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['workers'] });
    },
  });
};
