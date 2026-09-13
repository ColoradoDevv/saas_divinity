import { api } from '@/shared/api/api';
import type { Organization } from '@/modules/auth/types/auth';

export const organizationService = {
  async updateSettings(data: { currency?: string }): Promise<Organization> {
    const res = await api.patch('/organizations/me/', data);
    return res.data;
  },
};
