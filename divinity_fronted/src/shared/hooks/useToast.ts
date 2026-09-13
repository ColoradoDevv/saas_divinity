import { useToastStore } from '@/shared/store/toast';

export const useToast = () => useToastStore((state) => state.show);
