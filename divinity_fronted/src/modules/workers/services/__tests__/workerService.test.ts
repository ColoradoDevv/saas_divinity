import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workerService } from '../workerService';
import { api } from '@/shared/api/api';

vi.mock('@/shared/api/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);
const mockPatch = vi.mocked(api.patch);
const mockDelete = vi.mocked(api.delete);

beforeEach(() => vi.clearAllMocks());

describe('workerService.getWorkers', () => {
  it('GETs /workers/ and returns workers array', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await workerService.getWorkers();
    expect(mockGet).toHaveBeenCalledWith('/workers/');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('propagates network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    await expect(workerService.getWorkers()).rejects.toThrow('Network Error');
  });
});

describe('workerService.createWorker', () => {
  it('POSTs /workers/ with payload', async () => {
    const payload = { first_name: 'Juan', last_name: 'Perez' } as never;
    mockPost.mockResolvedValueOnce({ data: { id: 2 } });
    const result = await workerService.createWorker(payload);
    expect(mockPost).toHaveBeenCalledWith('/workers/', payload);
    expect(result).toEqual({ id: 2 });
  });
});

describe('workerService.updateWorker', () => {
  it('PATCHes /workers/{id}/ with payload', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 5, position: 'Dev' } });
    const result = await workerService.updateWorker(5, { position: 'Dev' });
    expect(mockPatch).toHaveBeenCalledWith('/workers/5/', { position: 'Dev' });
    expect(result).toEqual({ id: 5, position: 'Dev' });
  });
});

describe('workerService.deleteWorker', () => {
  it('DELETEs /workers/{id}/', async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });
    await workerService.deleteWorker(5);
    expect(mockDelete).toHaveBeenCalledWith('/workers/5/');
  });
});

describe('workerService.getTasks', () => {
  it('GETs /workers/tasks/ without workerId', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await workerService.getTasks();
    expect(mockGet).toHaveBeenCalledWith('/workers/tasks/');
  });

  it('GETs /workers/tasks/?worker_id=3 with workerId', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await workerService.getTasks(3);
    expect(mockGet).toHaveBeenCalledWith('/workers/tasks/?worker_id=3');
  });
});

describe('workerService.createTask', () => {
  it('POSTs /workers/tasks/ with payload', async () => {
    const payload = { title: 'Task', priority: 'high' } as never;
    mockPost.mockResolvedValueOnce({ data: { id: 1 } });
    await workerService.createTask(payload);
    expect(mockPost).toHaveBeenCalledWith('/workers/tasks/', payload);
  });
});

describe('workerService.updateTask', () => {
  it('PATCHes /workers/tasks/{id}/ with payload', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 7, status: 'done' } });
    await workerService.updateTask(7, { status: 'done' });
    expect(mockPatch).toHaveBeenCalledWith('/workers/tasks/7/', { status: 'done' });
  });
});

describe('workerService.deleteTask', () => {
  it('DELETEs /workers/tasks/{id}/', async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });
    await workerService.deleteTask(7);
    expect(mockDelete).toHaveBeenCalledWith('/workers/tasks/7/');
  });

  it('propagates 403 error', async () => {
    const err = Object.assign(new Error('403'), { response: { status: 403 } });
    mockDelete.mockRejectedValueOnce(err);
    await expect(workerService.deleteTask(7)).rejects.toMatchObject({ message: '403' });
  });
});
