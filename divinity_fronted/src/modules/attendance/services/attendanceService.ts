import { api } from '@/shared/api/api';
import type {
  AttendanceByWeekday,
  BiometricDevice,
  BiometricDeviceWithKey,
  CheckIn,
  CheckInPayload,
  CheckInResult,
  MemberBiometricEnrollment,
} from '../types';

export const attendanceService = {
  async checkIn(payload: CheckInPayload): Promise<CheckInResult> {
    const res = await api.post('/attendance/checkin/', payload);
    return res.data;
  },

  async getToday(): Promise<CheckIn[]> {
    const res = await api.get('/attendance/today/');
    return res.data;
  },

  async getMemberHistory(memberId: number): Promise<CheckIn[]> {
    const res = await api.get(`/attendance/members/${memberId}/history/`);
    return res.data;
  },

  async getByWeekday(days = 30): Promise<AttendanceByWeekday[]> {
    const res = await api.get(`/attendance/reports/by-weekday/?days=${days}`);
    return res.data;
  },

  // ── Dispositivos biométricos (complemento) ──────────────────────────────

  async getDevices(): Promise<BiometricDevice[]> {
    const res = await api.get('/attendance/devices/');
    return res.data;
  },

  async createDevice(name: string): Promise<BiometricDeviceWithKey> {
    const res = await api.post('/attendance/devices/', { name });
    return res.data;
  },

  async updateDevice(id: number, data: { name?: string; is_active?: boolean }): Promise<BiometricDevice> {
    const res = await api.patch(`/attendance/devices/${id}/`, data);
    return res.data;
  },

  async rotateDeviceKey(id: number): Promise<BiometricDeviceWithKey> {
    const res = await api.post(`/attendance/devices/${id}/rotate-key/`);
    return res.data;
  },

  async getDeviceEnrollments(deviceId: number): Promise<MemberBiometricEnrollment[]> {
    const res = await api.get(`/attendance/devices/${deviceId}/enrollments/`);
    return res.data;
  },

  async createEnrollment(deviceId: number, memberId: number, externalUserId: string): Promise<MemberBiometricEnrollment> {
    const res = await api.post(`/attendance/devices/${deviceId}/enrollments/`, {
      member_id: memberId, external_user_id: externalUserId,
    });
    return res.data;
  },

  async deleteEnrollment(deviceId: number, enrollmentId: number): Promise<void> {
    await api.delete(`/attendance/devices/${deviceId}/enrollments/${enrollmentId}/`);
  },

  async getMemberEnrollments(memberId: number): Promise<MemberBiometricEnrollment[]> {
    const res = await api.get(`/attendance/members/${memberId}/enrollments/`);
    return res.data;
  },
};
