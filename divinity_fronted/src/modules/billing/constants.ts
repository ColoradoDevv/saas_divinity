import type { PaymentMethod, SubscriptionStatus } from './types';

export const SUBSCRIPTION_STATUS_CONFIG: Record<SubscriptionStatus, { label: string; cls: string }> = {
  active:    { label: 'Activa',     cls: 'bg-tertiary-container text-on-tertiary-container' },
  frozen:    { label: 'Congelada',  cls: 'bg-secondary-container text-on-secondary-container' },
  expired:   { label: 'Vencida',    cls: 'bg-error-container text-on-error-container' },
  cancelled: { label: 'Cancelada',  cls: 'bg-surface-container text-on-surface-variant' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro',
};

export const DURATION_UNIT_LABELS: Record<string, string> = {
  day: 'día(s)', week: 'semana(s)', month: 'mes(es)', year: 'año(s)',
};
