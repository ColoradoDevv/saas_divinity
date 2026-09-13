export interface PortalMemberProfile {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  member_code: string;
  status: string;
  organization_name: string;
  organization_logo_url: string;
  organization_currency: string;
}

export interface PortalTokens {
  access: string;
  refresh: string;
}

export interface PortalLoginResponse {
  tokens: PortalTokens;
  member: PortalMemberProfile;
}

export interface PortalSubscription {
  id: number;
  member_id: number;
  member_name: string;
  plan_id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'frozen' | 'cancelled' | 'expired';
  frozen_since: string | null;
  created_at: string | null;
}

export interface PortalPayment {
  id: number;
  member_id: number;
  subscription_id: number | null;
  amount: string;
  method: string;
  paid_at: string;
  notes: string;
  registered_by_id: number | null;
  created_at: string | null;
}

export interface PortalBilling {
  current_subscription: PortalSubscription | null;
  subscriptions: PortalSubscription[];
  payments: PortalPayment[];
}

export interface PortalCheckIn {
  id: number;
  member_id: number;
  member_name: string;
  method: string;
  checked_in_at: string | null;
  registered_by_id: number | null;
}

export interface PortalClassSession {
  id: number;
  class_type_id: number;
  class_type_name: string;
  schedule_id: number | null;
  date: string;
  start_time: string;
  instructor_id: number | null;
  instructor_name: string;
  capacity: number;
  status: 'scheduled' | 'cancelled';
  enrolled_count: number;
  my_enrollment_status: 'booked' | 'attended' | 'no_show' | 'cancelled' | null;
  my_enrollment_id: number | null;
}

export interface PortalEnrollment {
  id: number;
  session_id: number;
  member_id: number;
  member_name: string;
  member_email: string;
  status: 'booked' | 'attended' | 'no_show' | 'cancelled';
  created_at: string | null;
}
