/** Debe reflejar CURRENCY_CHOICES en divinity_backend/domain/organizations/currency.py */
export const CURRENCY_OPTIONS: { code: string; label: string }[] = [
  { code: 'COP', label: 'Peso colombiano (COP)' },
  { code: 'USD', label: 'Dólar estadounidense (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'MXN', label: 'Peso mexicano (MXN)' },
  { code: 'ARS', label: 'Peso argentino (ARS)' },
  { code: 'CLP', label: 'Peso chileno (CLP)' },
  { code: 'PEN', label: 'Sol peruano (PEN)' },
  { code: 'BRL', label: 'Real brasileño (BRL)' },
];

export const DEFAULT_CURRENCY = 'COP';

/** Formatea un monto según la moneda de la organización (por defecto COP). */
export const formatMoney = (amount: string | number, currency: string = DEFAULT_CURRENCY): string => {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(value);
  } catch {
    // Código de moneda inválido/no soportado por Intl — no debería pasar con la lista curada, pero no reventamos la UI.
    return `${currency} ${value.toLocaleString('es-CO')}`;
  }
};
