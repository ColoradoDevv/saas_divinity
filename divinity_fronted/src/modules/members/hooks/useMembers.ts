import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateMemberData, UpdateMemberData } from '../types';
import { memberService } from '../services/memberService';

export const useMembers = (page = 1, search = '', status = '') =>
  useQuery({
    queryKey: ['members', page, search, status],
    queryFn: () => memberService.getMembers(page, search, status),
  });

export const useMember = (id: number) =>
  useQuery({
    queryKey: ['member', id],
    queryFn: () => memberService.getMember(id),
    enabled: !!id,
  });

export const useCreateMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMemberData) => memberService.createMember(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members'] }); },
  });
};

export const useUpdateMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMemberData }) =>
      memberService.updateMember(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['member', id] });
    },
  });
};

export const useDeactivateMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => memberService.deactivateMember(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members'] }); },
  });
};
