import { useMutation } from '@tanstack/react-query';

import { useOrgStore } from '@/app/store/org';
import { organizationService } from '../services/organizationService';

export const useUpdateOrganizationSettings = () => {
  return useMutation({
    mutationFn: (data: { currency?: string }) => organizationService.updateSettings(data),
    onSuccess: (updatedOrg) => {
      const { role, allowedModules, position, modulePermissions, setOrganization } = useOrgStore.getState();
      setOrganization(updatedOrg, role ?? 'admin', allowedModules, position, modulePermissions);
    },
  });
};
