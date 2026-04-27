import { useQuery } from '@tanstack/react-query';

import { authService } from '../services/authService';

export const useAuthMe = () =>
  useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getCurrentUser,
    staleTime: 60_000,
  });
