import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FieldConfig } from '../types';
import { memberService } from '../services/memberService';

export const useFieldConfig = () =>
  useQuery({
    queryKey: ['members', 'field-config'],
    queryFn: memberService.getFieldConfig,
  });

export const useUpdateFieldConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configs: FieldConfig[]) => memberService.updateFieldConfigBulk(configs),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', 'field-config'] }); },
  });
};
