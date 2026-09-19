import { describe, expect, it } from 'vitest';

import { derivePrimaryFamily } from '../color';

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

describe('derivePrimaryFamily', () => {
  it('returns valid hex colors for every field, light and dark', () => {
    for (const dark of [false, true]) {
      const family = derivePrimaryFamily('#1e40af', dark);
      expect(isHex(family.primary)).toBe(true);
      expect(isHex(family.onPrimary)).toBe(true);
      expect(isHex(family.primaryContainer)).toBe(true);
      expect(isHex(family.onPrimaryContainer)).toBe(true);
    }
  });

  it('produces a lighter primary for dark mode than for light mode (same hue)', () => {
    const light = derivePrimaryFamily('#7c3aed', false);
    const dark = derivePrimaryFamily('#7c3aed', true);
    const lightness = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (r + g + b) / 3;
    };
    expect(lightness(dark.primary)).toBeGreaterThan(lightness(light.primary));
  });

  it('always picks readable text for the resulting primary, whatever the input hue', () => {
    // Amarillo pastel: incluso "oscurecido" a L=30-45%, el amarillo sigue siendo
    // perceptualmente muy luminoso (canal verde pesa fuerte en WCAG) — corresponde
    // texto oscuro, no blanco. Es la razón de ser de onPrimary: nunca asumir blanco.
    const fromPastel = derivePrimaryFamily('#fde68a', false);
    expect(fromPastel.onPrimary).toBe('#1c1917');

    const fromDeepNavy = derivePrimaryFamily('#111827', false);
    expect(fromDeepNavy.onPrimary).toBe('#ffffff');
  });

  it('never crashes on an achromatic (gray) base color', () => {
    expect(() => derivePrimaryFamily('#808080', false)).not.toThrow();
    expect(() => derivePrimaryFamily('#808080', true)).not.toThrow();
  });

  it('is deterministic for the same input', () => {
    const a = derivePrimaryFamily('#065f46', false);
    const b = derivePrimaryFamily('#065f46', false);
    expect(a).toEqual(b);
  });
});
