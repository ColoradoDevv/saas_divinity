import { api } from '@/shared/api/api';
import type {
  ClassEnrollment,
  ClassSchedule,
  ClassSession,
  ClassType,
  CreateClassTypeData,
  CreateScheduleData,
  SessionDetail,
  UpdateClassTypeData,
  UpdateScheduleData,
} from '../types';

export const classService = {
  async getClassTypes(): Promise<ClassType[]> {
    const res = await api.get('/classes/types/');
    return res.data;
  },

  async createClassType(data: CreateClassTypeData): Promise<ClassType> {
    const res = await api.post('/classes/types/', data);
    return res.data;
  },

  async updateClassType(id: number, data: UpdateClassTypeData): Promise<ClassType> {
    const res = await api.patch(`/classes/types/${id}/`, data);
    return res.data;
  },

  async deactivateClassType(id: number): Promise<void> {
    await api.delete(`/classes/types/${id}/`);
  },

  async getSchedules(): Promise<ClassSchedule[]> {
    const res = await api.get('/classes/schedules/');
    return res.data;
  },

  async createSchedule(data: CreateScheduleData): Promise<ClassSchedule> {
    const res = await api.post('/classes/schedules/', data);
    return res.data;
  },

  async updateSchedule(id: number, data: UpdateScheduleData): Promise<ClassSchedule> {
    const res = await api.patch(`/classes/schedules/${id}/`, data);
    return res.data;
  },

  async deactivateSchedule(id: number): Promise<void> {
    await api.delete(`/classes/schedules/${id}/`);
  },

  async getSessions(dateFrom: string, dateTo: string): Promise<ClassSession[]> {
    const res = await api.get(`/classes/sessions/?date_from=${dateFrom}&date_to=${dateTo}`);
    return res.data;
  },

  async getSessionDetail(id: number): Promise<SessionDetail> {
    const res = await api.get(`/classes/sessions/${id}/`);
    return res.data;
  },

  async enrollMember(sessionId: number, memberId: number): Promise<ClassEnrollment> {
    const res = await api.post(`/classes/sessions/${sessionId}/enroll/`, { member_id: memberId });
    return res.data;
  },

  async cancelSession(sessionId: number): Promise<ClassSession> {
    const res = await api.post(`/classes/sessions/${sessionId}/cancel/`);
    return res.data;
  },

  async cancelEnrollment(enrollmentId: number): Promise<ClassEnrollment> {
    const res = await api.post(`/classes/enrollments/${enrollmentId}/cancel/`);
    return res.data;
  },

  async markAttended(enrollmentId: number): Promise<ClassEnrollment> {
    const res = await api.post(`/classes/enrollments/${enrollmentId}/attend/`);
    return res.data;
  },
};
