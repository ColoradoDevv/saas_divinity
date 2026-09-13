import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api/api';

export interface VerticalModule {
  key: string;
  label: string;
}

export interface VerticalDefinition {
  label: string;
  modules: VerticalModule[];
}

/** Catálogo por business_type, ej. { generic: {label, modules}, gym: {label, modules} }. */
export type VerticalCatalog = Record<string, VerticalDefinition>;

const fetchVerticalCatalog = async (): Promise<VerticalCatalog> => {
  const res = await api.get('/organizations/verticals/');
  return res.data;
};

/**
 * Catálogo de módulos por vertical de negocio (business_type), usado por el
 * alta de empresas del superadmin y el onboarding de la empresa para no
 * duplicar la lista de módulos disponibles en el frontend.
 */
export const useVerticalCatalog = () =>
  useQuery({
    queryKey: ['organizations', 'verticals'],
    queryFn: fetchVerticalCatalog,
    staleTime: 5 * 60_000,
  });
