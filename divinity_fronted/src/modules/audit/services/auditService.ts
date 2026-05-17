import { api } from '@/shared/api/api';
import type { PaginatedResponse } from '@/shared/types';

export interface AuditLog {
  id: number;
  timestamp: string;
  user_email: string | null;
  organization_name: string | null;
  action: string;
  model_name: string;
  object_id: string;
}

export interface AuditLogFilters {
  page?: number;
  action?: string;
  model?: string;
  from?: string;
  to?: string;
}

export const auditService = {
  async getLogs(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> {
    const params: Record<string, string | number> = {};
    if (filters.page) params['page'] = filters.page;
    if (filters.action) params['action'] = filters.action;
    if (filters.model) params['model'] = filters.model;
    if (filters.from) params['from'] = filters.from;
    if (filters.to) params['to'] = filters.to;

    const response = await api.get<PaginatedResponse<AuditLog>>('/audit/logs/', { params });
    return response.data;
  },
};
