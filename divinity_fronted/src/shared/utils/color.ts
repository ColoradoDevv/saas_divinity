interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function hexToHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: Hsl): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Luminancia relativa (WCAG) — para decidir si el texto sobre un color debe ser claro u oscuro. */
function luminance(hex: string): number {
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(1 + i, 3 + i), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export interface PrimaryFamily {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
}

/**
 * Deriva toda la "familia" tonal del primario (botón, texto sobre el botón,
 * contenedor de acento pálido, texto sobre ese contenedor) a partir de un
 * único color que eligió la organización — mismo criterio que usa la marca
 * para su propio azul (#1e40af claro / #7aa8ef oscuro), aplicado a
 * cualquier matiz para que un negocio pueda tener su color en vez del azul
 * de Divinity en botones, el resaltado activo del menú, etc.
 */
export function derivePrimaryFamily(baseHex: string, dark: boolean): PrimaryFamily {
  const base = hexToHsl(baseHex);
  const s = clamp(base.s, 35, 85);

  const primary = dark
    ? hslToHex({ h: base.h, s: clamp(s - 15, 30, 70), l: clamp(base.l + 25, 62, 78) })
    : hslToHex({ h: base.h, s, l: clamp(base.l, 30, 45) });
  const onPrimary = luminance(primary) > 0.4 ? '#1c1917' : '#ffffff';

  const primaryContainer = dark
    ? hslToHex({ h: base.h, s: clamp(s - 10, 25, 55), l: 26 })
    : hslToHex({ h: base.h, s: clamp(s, 30, 55), l: 87 });
  const onPrimaryContainer = dark
    ? hslToHex({ h: base.h, s: clamp(s, 30, 55), l: 88 })
    : hslToHex({ h: base.h, s: clamp(s, 40, 70), l: 22 });

  return { primary, onPrimary, primaryContainer, onPrimaryContainer };
}
