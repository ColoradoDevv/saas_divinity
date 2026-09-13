import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api/api';

export interface AddonModule {
  key: string;
  label: string;
}

const fetchAddonCatalog = async (): Promise<AddonModule[]> => {
  const res = await api.get('/organizations/addons/');
  return res.data;
};

/**
 * Catálogo de complementos (ej. huella digital) — a diferencia de
 * useVerticalCatalog, esto es superadmin-only: representa algo que el
 * negocio adquiere aparte del plan, nunca autoactivable por la propia
 * organización.
 */
export const useAddonCatalog = () =>
  useQuery({
    queryKey: ['organizations', 'addons'],
    queryFn: fetchAddonCatalog,
    staleTime: 5 * 60_000,
  });
