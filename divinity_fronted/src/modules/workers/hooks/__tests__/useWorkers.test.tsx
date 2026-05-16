import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { workerService } from '../../services/workerService';
import { useWorkers, useCreateWorker, useUpdateWorker, useDeleteWorker, useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../useWorkers';

vi.mock('../../services/workerService', () => ({
  workerService: {
    getWorkers: vi.fn(), createWorker: vi.fn(), updateWorker: vi.fn(), deleteWorker: vi.fn(),
    getTasks: vi.fn(), createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
  },
}));

const mockService = vi.mocked(workerService);

let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('useWorkers', () => {
  it('fetches and returns worker list', async () => {
    mockService.getWorkers.mockResolvedValueOnce([{ id: 1 }] as never);
    const { result } = renderHook(() => useWorkers(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 1 }]);
  });

  it('propagates error state', async () => {
    mockService.getWorkers.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useWorkers(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateWorker', () => {
  it('calls createWorker and invalidates [workers] query', async () => {
    mockService.createWorker.mockResolvedValueOnce({ id: 2 } as never);
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useCreateWorker(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ first_name: 'J' } as never); });
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['workers'] }));
  });
});

describe('useUpdateWorker', () => {
  it('calls updateWorker with id and payload', async () => {
    mockService.updateWorker.mockResolvedValueOnce({ id: 5 } as never);
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateWorker(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ id: 5, payload: { position: 'Dev' } }); });
    expect(mockService.updateWorker).toHaveBeenCalledWith(5, { position: 'Dev' });
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['workers'] }));
  });
});

describe('useDeleteWorker', () => {
  it('calls deleteWorker and invalidates workers', async () => {
    mockService.deleteWorker.mockResolvedValueOnce(undefined);
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteWorker(), { wrapper });
    await act(async () => { await result.current.mutateAsync(5); });
    expect(mockService.deleteWorker).toHaveBeenCalledWith(5);
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['workers'] }));
  });
});

describe('useTasks', () => {
  it('calls getTasks without workerId', async () => {
    mockService.getTasks.mockResolvedValueOnce([]);
    renderHook(() => useTasks(), { wrapper });
    await waitFor(() => expect(mockService.getTasks).toHaveBeenCalledWith(undefined));
  });

  it('calls getTasks with workerId', async () => {
    mockService.getTasks.mockResolvedValueOnce([]);
    renderHook(() => useTasks(3), { wrapper });
    await waitFor(() => expect(mockService.getTasks).toHaveBeenCalledWith(3));
  });
});

describe('useCreateTask', () => {
  it('invalidates both tasks and workers on success', async () => {
    mockService.createTask.mockResolvedValueOnce({ id: 1 } as never);
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useCreateTask(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ title: 'T' } as never); });
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['tasks'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['workers'] }));
  });
});

describe('useUpdateTask', () => {
  it('calls updateTask with id and payload', async () => {
    mockService.updateTask.mockResolvedValueOnce({ id: 7 } as never);
    const { result } = renderHook(() => useUpdateTask(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ id: 7, payload: { status: 'done' } }); });
    expect(mockService.updateTask).toHaveBeenCalledWith(7, { status: 'done' });
  });
});

describe('useDeleteTask', () => {
  it('invalidates tasks and workers on delete', async () => {
    mockService.deleteTask.mockResolvedValueOnce(undefined);
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteTask(), { wrapper });
    await act(async () => { await result.current.mutateAsync(7); });
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['tasks'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['workers'] }));
  });
});
