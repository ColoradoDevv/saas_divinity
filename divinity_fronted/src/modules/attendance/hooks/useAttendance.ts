import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { attendanceService } from '../services/attendanceService';
import type { CheckInPayload } from '../types';

export const useCheckIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckInPayload) => attendanceService.checkIn(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'today'] }),
  });
};

export const useTodayAttendance = () =>
  useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceService.getToday(),
    refetchInterval: 30_000,
  });

export const useMemberAttendanceHistory = (memberId: number) =>
  useQuery({
    queryKey: ['attendance', 'member', memberId],
    queryFn: () => attendanceService.getMemberHistory(memberId),
    enabled: !!memberId,
  });

export const useAttendanceByWeekday = (days = 30) =>
  useQuery({
    queryKey: ['attendance', 'reports', 'by-weekday', days],
    queryFn: () => attendanceService.getByWeekday(days),
  });

// ── Dispositivos biométricos (complemento) ────────────────────────────────

export const useBiometricDevices = () =>
  useQuery({ queryKey: ['attendance', 'devices'], queryFn: () => attendanceService.getDevices() });

export const useCreateDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => attendanceService.createDevice(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'devices'] }),
  });
};

export const useUpdateDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; is_active?: boolean } }) =>
      attendanceService.updateDevice(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'devices'] }),
  });
};

export const useRotateDeviceKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => attendanceService.rotateDeviceKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'devices'] }),
  });
};

export const useDeviceEnrollments = (deviceId: number | null) =>
  useQuery({
    queryKey: ['attendance', 'device-enrollments', deviceId],
    queryFn: () => attendanceService.getDeviceEnrollments(deviceId as number),
    enabled: deviceId !== null,
  });

export const useCreateEnrollment = (deviceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, externalUserId }: { memberId: number; externalUserId: string }) =>
      attendanceService.createEnrollment(deviceId, memberId, externalUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'device-enrollments', deviceId] });
      qc.invalidateQueries({ queryKey: ['attendance', 'member-enrollments'] });
    },
  });
};

export const useDeleteEnrollment = (deviceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: number) => attendanceService.deleteEnrollment(deviceId, enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'device-enrollments', deviceId] });
      qc.invalidateQueries({ queryKey: ['attendance', 'member-enrollments'] });
    },
  });
};

export const useMemberEnrollments = (memberId: number) =>
  useQuery({
    queryKey: ['attendance', 'member-enrollments', memberId],
    queryFn: () => attendanceService.getMemberEnrollments(memberId),
    enabled: !!memberId,
  });
