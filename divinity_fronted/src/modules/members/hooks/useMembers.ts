import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateMemberData, UpdateMemberData } from '../types';
import { memberService } from '../services/memberService';

export const useMembers = (page = 1, search = '', status = '') =>
  useQuery({
    queryKey: ['members', page, search, status],
    queryFn: () => memberService.getMembers(page, search, status),
  });

/** Accumulates pages (for a "Cargar más" list) instead of replacing them, unlike `useMembers`. */
export const useInfiniteMembers = (search = '', status = '') =>
  useInfiniteQuery({
    queryKey: ['members', 'infinite', search, status],
    queryFn: ({ pageParam }) => memberService.getMembers(pageParam, search, status),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
      return loaded < lastPage.count ? allPages.length + 1 : undefined;
    },
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

export const useActivatePortalAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => memberService.activatePortalAccess(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['member', id] });
    },
  });
};
