import { describe, expect, it } from 'vitest';

import { formatMoney } from '../currency';

describe('formatMoney', () => {
  it('formats a numeric string using the given currency', () => {
    expect(formatMoney('1000', 'COP')).toContain('1.000');
  });

  it('formats a plain number', () => {
    expect(formatMoney(50, 'USD')).toContain('50');
  });

  it('defaults to COP when no currency is given', () => {
    const result = formatMoney(1000);
    expect(result).toContain('1.000');
  });

  it('returns an em dash for non-numeric input', () => {
    expect(formatMoney('not-a-number')).toBe('—');
  });

  it('falls back gracefully for an unsupported currency code', () => {
    expect(formatMoney(100, 'ZZZ')).toContain('100');
  });
});
