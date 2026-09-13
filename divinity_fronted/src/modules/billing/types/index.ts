export type DurationUnit = 'day' | 'week' | 'month' | 'year';
export type SubscriptionStatus = 'active' | 'frozen' | 'cancelled' | 'expired';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_value: number;
  duration_unit: DurationUnit;
  is_active: boolean;
}

export interface Subscription {
  id: number;
  member_id: number;
  member_name: string;
  plan_id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  frozen_since: string | null;
  created_at: string | null;
}

export interface Payment {
  id: number;
  member_id: number;
  member_name: string;
  subscription_id: number | null;
  amount: string;
  method: PaymentMethod;
  paid_at: string;
  notes: string;
  registered_by_id: number | null;
  registered_by_name: string;
  created_at: string | null;
}

export interface PaymentFilters {
  date_from?: string;
  date_to?: string;
  member_id?: number;
  method?: PaymentMethod;
}

export interface MemberBilling {
  current_subscription: Subscription | null;
  subscriptions: Subscription[];
  payments: Payment[];
}

export interface CreatePlanData {
  name: string;
  description?: string;
  price: string;
  duration_value: number;
  duration_unit: DurationUnit;
}

export type UpdatePlanData = Partial<CreatePlanData> & { is_active?: boolean };

export interface RenewMembershipData {
  member_id: number;
  plan_id: number;
  method: PaymentMethod;
  amount?: string;
  start_date?: string;
  paid_at?: string;
  notes?: string;
}

export interface RenewMembershipResponse {
  subscription: Subscription;
  payment: Payment;
}

export interface DashboardSummary {
  revenue_today: string;
  checkins_today: number;
  new_members_7d: number;
  active_members: number;
}

export interface RevenueByMonth {
  month: string;
  total: string;
}

export interface MembershipStatusReport {
  active: number;
  frozen: number;
  expired: number;
  cancelled: number;
}

export interface DailyStat {
  date: string;
  revenue: string;
  checkins: number;
  new_members: number;
}

export type ReportExportFormat = 'xlsx' | 'pdf';
