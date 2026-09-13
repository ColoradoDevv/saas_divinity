import { api } from '@/shared/api/api';
import type {
  CreatePlanData,
  DailyStat,
  DashboardSummary,
  MemberBilling,
  MembershipStatusReport,
  Payment,
  PaymentFilters,
  Plan,
  RenewMembershipData,
  RenewMembershipResponse,
  ReportExportFormat,
  RevenueByMonth,
  Subscription,
  UpdatePlanData,
} from '../types';

export const billingService = {
  async getPlans(activeOnly = false): Promise<Plan[]> {
    const res = await api.get(`/billing/plans/${activeOnly ? '?active_only=true' : ''}`);
    return res.data;
  },

  async createPlan(data: CreatePlanData): Promise<Plan> {
    const res = await api.post('/billing/plans/', data);
    return res.data;
  },

  async updatePlan(id: number, data: UpdatePlanData): Promise<Plan> {
    const res = await api.patch(`/billing/plans/${id}/`, data);
    return res.data;
  },

  async deactivatePlan(id: number): Promise<void> {
    await api.delete(`/billing/plans/${id}/`);
  },

  async getMemberBilling(memberId: number): Promise<MemberBilling> {
    const res = await api.get(`/billing/members/${memberId}/`);
    return res.data;
  },

  async renewMembership(data: RenewMembershipData): Promise<RenewMembershipResponse> {
    const res = await api.post('/billing/renew/', data);
    return res.data;
  },

  async freezeSubscription(id: number): Promise<Subscription> {
    const res = await api.post(`/billing/subscriptions/${id}/freeze/`);
    return res.data;
  },

  async resumeSubscription(id: number): Promise<Subscription> {
    const res = await api.post(`/billing/subscriptions/${id}/resume/`);
    return res.data;
  },

  async getExpiring(days = 7): Promise<Subscription[]> {
    const res = await api.get(`/billing/expiring/?days=${days}`);
    return res.data;
  },

  async getPayments(filters: PaymentFilters = {}): Promise<Payment[]> {
    const res = await api.get('/billing/payments/', { params: filters });
    return res.data;
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await api.get('/billing/summary/');
    return res.data;
  },

  async getRevenueByMonth(months = 6): Promise<RevenueByMonth[]> {
    const res = await api.get(`/billing/reports/revenue-by-month/?months=${months}`);
    return res.data;
  },

  async getMembershipStatusReport(): Promise<MembershipStatusReport> {
    const res = await api.get('/billing/reports/membership-status/');
    return res.data;
  },

  async getDailyStats(dateFrom: string, dateTo: string): Promise<DailyStat[]> {
    const res = await api.get(`/billing/reports/daily/?date_from=${dateFrom}&date_to=${dateTo}`);
    return res.data;
  },

  async downloadReportExport(exportFormat: ReportExportFormat, dateFrom: string, dateTo: string): Promise<Blob> {
    const res = await api.get('/billing/reports/export/', {
      params: { export_format: exportFormat, date_from: dateFrom, date_to: dateTo },
      responseType: 'blob',
    });
    return res.data;
  },
};
