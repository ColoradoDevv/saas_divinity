import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { classService } from '../services/classService';
import type { CreateClassTypeData, CreateScheduleData, UpdateClassTypeData, UpdateScheduleData } from '../types';

export const useClassTypes = () =>
  useQuery({ queryKey: ['classes', 'types'], queryFn: classService.getClassTypes });

export const useCreateClassType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClassTypeData) => classService.createClassType(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes', 'types'] }),
  });
};

export const useUpdateClassType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClassTypeData }) => classService.updateClassType(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes', 'types'] }),
  });
};

export const useDeactivateClassType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => classService.deactivateClassType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes', 'types'] }),
  });
};

export const useSchedules = () =>
  useQuery({ queryKey: ['classes', 'schedules'], queryFn: classService.getSchedules });

export const useCreateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduleData) => classService.createSchedule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', 'schedules'] });
      qc.invalidateQueries({ queryKey: ['classes', 'sessions'] });
    },
  });
};

export const useUpdateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateScheduleData }) => classService.updateSchedule(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', 'schedules'] });
      qc.invalidateQueries({ queryKey: ['classes', 'sessions'] });
    },
  });
};

export const useDeactivateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => classService.deactivateSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes', 'schedules'] }),
  });
};

export const useSessions = (dateFrom: string, dateTo: string) =>
  useQuery({
    queryKey: ['classes', 'sessions', dateFrom, dateTo],
    queryFn: () => classService.getSessions(dateFrom, dateTo),
  });

export const useSessionDetail = (id: number | null) =>
  useQuery({
    queryKey: ['classes', 'session', id],
    queryFn: () => classService.getSessionDetail(id as number),
    enabled: id !== null,
  });

export const useEnrollMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, memberId }: { sessionId: number; memberId: number }) =>
      classService.enrollMember(sessionId, memberId),
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: ['classes', 'sessions'] });
      qc.invalidateQueries({ queryKey: ['classes', 'session', sessionId] });
    },
  });
};

export const useCancelSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => classService.cancelSession(sessionId),
    onSuccess: (_, sessionId) => {
      qc.invalidateQueries({ queryKey: ['classes', 'sessions'] });
      qc.invalidateQueries({ queryKey: ['classes', 'session', sessionId] });
    },
  });
};

export const useCancelEnrollment = (sessionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: number) => classService.cancelEnrollment(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', 'sessions'] });
      qc.invalidateQueries({ queryKey: ['classes', 'session', sessionId] });
    },
  });
};

export const useMarkAttended = (sessionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: number) => classService.markAttended(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', 'session', sessionId] });
    },
  });
};
