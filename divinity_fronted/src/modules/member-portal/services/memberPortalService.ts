import type {
  PortalBilling,
  PortalCheckIn,
  PortalClassSession,
  PortalEnrollment,
  PortalLoginResponse,
  PortalMemberProfile,
} from '../types';
import { portalApi } from './portalApi';

export const memberPortalService = {
  async login(email: string, password: string): Promise<PortalLoginResponse> {
    const res = await portalApi.post('/member-portal/login/', { email, password });
    return res.data;
  },

  async acceptInvite(token: string, password: string): Promise<PortalLoginResponse> {
    const res = await portalApi.post('/member-portal/accept-invite/', { token, password });
    return res.data;
  },

  async getMe(): Promise<PortalMemberProfile> {
    const res = await portalApi.get('/member-portal/me/');
    return res.data;
  },

  async getBilling(): Promise<PortalBilling> {
    const res = await portalApi.get('/member-portal/billing/');
    return res.data;
  },

  async getAttendance(): Promise<PortalCheckIn[]> {
    const res = await portalApi.get('/member-portal/attendance/');
    return res.data;
  },

  async getSessions(dateFrom: string, dateTo: string): Promise<PortalClassSession[]> {
    const res = await portalApi.get(`/member-portal/classes/sessions/?date_from=${dateFrom}&date_to=${dateTo}`);
    return res.data;
  },

  async enroll(sessionId: number): Promise<PortalEnrollment> {
    const res = await portalApi.post(`/member-portal/classes/sessions/${sessionId}/enroll/`);
    return res.data;
  },

  async cancelEnrollment(enrollmentId: number): Promise<PortalEnrollment> {
    const res = await portalApi.post(`/member-portal/classes/enrollments/${enrollmentId}/cancel/`);
    return res.data;
  },
};
