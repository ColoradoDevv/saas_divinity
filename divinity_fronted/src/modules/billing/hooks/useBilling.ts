import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { billingService } from '../services/billingService';
import type {
  CreatePlanData,
  PaymentFilters,
  RenewMembershipData,
  ReportExportFormat,
  UpdatePlanData,
} from '../types';

export const usePlans = (activeOnly = false, enabled = true) =>
  useQuery({
    queryKey: ['billing', 'plans', activeOnly],
    queryFn: () => billingService.getPlans(activeOnly),
    enabled,
  });

export const useCreatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanData) => billingService.createPlan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'plans'] }),
  });
};

export const useUpdatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePlanData }) => billingService.updatePlan(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'plans'] }),
  });
};

export const useDeactivatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => billingService.deactivatePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'plans'] }),
  });
};

export const useMemberBilling = (memberId: number) =>
  useQuery({
    queryKey: ['billing', 'member', memberId],
    queryFn: () => billingService.getMemberBilling(memberId),
    enabled: !!memberId,
  });

export const useRenewMembership = (memberId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RenewMembershipData) => billingService.renewMembership(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', 'member', memberId] });
      qc.invalidateQueries({ queryKey: ['billing', 'expiring'] });
      qc.invalidateQueries({ queryKey: ['billing', 'payments'] });
      qc.invalidateQueries({ queryKey: ['billing', 'summary'] });
    },
  });
};

export const useFreezeSubscription = (memberId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => billingService.freezeSubscription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'member', memberId] }),
  });
};

export const useResumeSubscription = (memberId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => billingService.resumeSubscription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'member', memberId] }),
  });
};

export const useExpiringSubscriptions = (days = 7) =>
  useQuery({
    queryKey: ['billing', 'expiring', days],
    queryFn: () => billingService.getExpiring(days),
  });

export const usePayments = (filters: PaymentFilters = {}) =>
  useQuery({
    queryKey: ['billing', 'payments', filters],
    queryFn: () => billingService.getPayments(filters),
  });

export const useDashboardSummary = (enabled = true) =>
  useQuery({
    queryKey: ['billing', 'summary'],
    queryFn: () => billingService.getDashboardSummary(),
    enabled,
  });

export const useRevenueByMonth = (months = 6) =>
  useQuery({
    queryKey: ['billing', 'reports', 'revenue-by-month', months],
    queryFn: () => billingService.getRevenueByMonth(months),
  });

export const useMembershipStatusReport = () =>
  useQuery({
    queryKey: ['billing', 'reports', 'membership-status'],
    queryFn: () => billingService.getMembershipStatusReport(),
  });

export const useDailyStats = (dateFrom: string, dateTo: string) =>
  useQuery({
    queryKey: ['billing', 'reports', 'daily', dateFrom, dateTo],
    queryFn: () => billingService.getDailyStats(dateFrom, dateTo),
  });

export const useDownloadReportExport = () =>
  useMutation({
    mutationFn: ({ exportFormat, dateFrom, dateTo }: { exportFormat: ReportExportFormat; dateFrom: string; dateTo: string }) =>
      billingService.downloadReportExport(exportFormat, dateFrom, dateTo),
  });
