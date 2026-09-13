import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { memberPortalService } from '../services/memberPortalService';

export const usePortalLogin = () => {
  const setSession = useMemberPortalAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      memberPortalService.login(email, password),
    onSuccess: (data) => setSession(data.tokens, data.member),
  });
};

export const usePortalAcceptInvite = () => {
  const setSession = useMemberPortalAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      memberPortalService.acceptInvite(token, password),
    onSuccess: (data) => setSession(data.tokens, data.member),
  });
};

export const usePortalMe = () =>
  useQuery({ queryKey: ['portal', 'me'], queryFn: memberPortalService.getMe });

export const usePortalBilling = () =>
  useQuery({ queryKey: ['portal', 'billing'], queryFn: memberPortalService.getBilling });

export const usePortalAttendance = () =>
  useQuery({ queryKey: ['portal', 'attendance'], queryFn: memberPortalService.getAttendance });

export const usePortalSessions = (dateFrom: string, dateTo: string) =>
  useQuery({
    queryKey: ['portal', 'sessions', dateFrom, dateTo],
    queryFn: () => memberPortalService.getSessions(dateFrom, dateTo),
  });

export const usePortalEnroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => memberPortalService.enroll(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'sessions'] }),
  });
};

export const usePortalCancelEnrollment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: number) => memberPortalService.cancelEnrollment(enrollmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'sessions'] }),
  });
};
