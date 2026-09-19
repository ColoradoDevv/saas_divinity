import { useState } from 'react';

import { useOrgStore } from '@/app/store/org';
import { DEFAULT_CURRENCY } from '@/shared/utils/currency';

interface Props {
  /** Valor numérico crudo (ej. "150000" o "150000.5") — igual contrato que un <input> normal. */
  value: string;
  onChange: (value: string) => void;
  /** Por defecto, la moneda configurada de la organización (COP si no hay ninguna). */
  currency?: string;
  className?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
}

// Mismo aspecto que md3TextFieldClass, pero con el padding izquierdo reservado
// para el símbolo de moneda en vez de px-4 — no se puede simplemente agregar
// "pl-9" junto a md3TextFieldClass porque el orden de generación de Tailwind
// no garantiza que gane sobre el px-4 que ya trae.
const fieldClass =
  'h-11 w-full rounded-2xl border border-outline-variant bg-surface-container-low pl-9 pr-4 text-base leading-6 text-on-surface outline-none transition duration-150 ease-out placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-[3px] focus:ring-primary/15';

const currencySymbol = (currency: string): string => {
  try {
    const part = new Intl.NumberFormat('es-CO', { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value ?? '$';
  } catch {
    return '$';
  }
};

const fractionDigitsFor = (currency: string): number => {
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
};

const groupedDisplay = (raw: string, currency: string): string => {
  if (!raw.trim()) return '';
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString('es-CO', { maximumFractionDigits: fractionDigitsFor(currency) });
};

/**
 * Input de montos que respeta la moneda de la organización (punto de miles,
 * sin decimales para COP) en vez de un <input type="number"> plano, que no
 * puede mostrar separadores de miles y usa el formato numérico del navegador.
 * Mientras el campo tiene foco muestra el valor crudo (para no pelear con la
 * posición del cursor); lo agrupa apenas se pierde el foco.
 */
export const CurrencyInput = ({ value, onChange, currency, className = '', placeholder, id, required }: Props) => {
  const orgCurrency = useOrgStore((state) => state.organization?.currency) ?? DEFAULT_CURRENCY;
  const resolvedCurrency = currency ?? orgCurrency;
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
        {currencySymbol(resolvedCurrency)}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        required={required}
        className={`${fieldClass} ${className}`}
        value={focused ? value : groupedDisplay(value, resolvedCurrency)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          // Solo dígitos y un separador decimal mientras se edita — los
          // separadores de miles se muestran recién al perder el foco.
          const cleaned = e.target.value.replace(/[^\d.]/g, '');
          const firstDot = cleaned.indexOf('.');
          const normalized = firstDot === -1
            ? cleaned
            : `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, '')}`;
          onChange(normalized);
        }}
      />
    </div>
  );
};
