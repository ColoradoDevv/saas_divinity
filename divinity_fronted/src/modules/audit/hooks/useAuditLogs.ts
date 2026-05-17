import { useQuery } from '@tanstack/react-query';

import { auditService, type AuditLogFilters } from '../services/auditService';

export const useAuditLogs = (filters: AuditLogFilters = {}) =>
  useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditService.getLogs(filters),
  });
