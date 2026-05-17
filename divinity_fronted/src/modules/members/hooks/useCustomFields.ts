import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCustomFieldData, UpdateCustomFieldData } from '../types';
import { memberService } from '../services/memberService';

export const useCustomFields = () =>
  useQuery({
    queryKey: ['members', 'custom-fields'],
    queryFn: memberService.getCustomFields,
  });

export const useCreateCustomField = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomFieldData) => memberService.createCustomField(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', 'custom-fields'] }); },
  });
};

export const useUpdateCustomField = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomFieldData }) =>
      memberService.updateCustomField(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', 'custom-fields'] }); },
  });
};

export const useDeleteCustomField = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => memberService.deleteCustomField(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', 'custom-fields'] }); },
  });
};
