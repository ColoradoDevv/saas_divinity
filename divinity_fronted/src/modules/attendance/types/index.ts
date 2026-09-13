export type CheckInMethod = 'code' | 'manual' | 'face' | 'fingerprint';
export type SubscriptionCheckStatus = 'active' | 'frozen' | 'cancelled' | 'expired' | 'no_subscription';

export interface CheckIn {
  id: number;
  member_id: number;
  member_name: string;
  method: CheckInMethod;
  checked_in_at: string | null;
  registered_by_id: number | null;
}

export interface CheckInPayload {
  method: CheckInMethod;
  member_id?: number;
  member_code?: string;
}

export interface CheckInResult {
  checkin: CheckIn;
  subscription_status: SubscriptionCheckStatus;
}

export interface AttendanceByWeekday {
  weekday: number;
  label: string;
  count: number;
}

export interface BiometricDevice {
  id: number;
  name: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

export interface BiometricDeviceWithKey extends BiometricDevice {
  device_key: string;
}

export interface MemberBiometricEnrollment {
  id: number;
  device_id: number;
  device_name: string;
  member_id: number;
  member_name: string;
  external_user_id: string;
  created_at: string;
}
