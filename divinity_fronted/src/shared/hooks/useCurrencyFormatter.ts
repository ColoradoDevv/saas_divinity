import { useOrgStore } from '@/app/store/org';
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/utils/currency';

/** Devuelve una función que formatea montos con la moneda configurada de la organización actual. */
export const useCurrencyFormatter = () => {
  const currency = useOrgStore((state) => state.organization?.currency) ?? DEFAULT_CURRENCY;
  return (amount: string | number) => formatMoney(amount, currency);
};
