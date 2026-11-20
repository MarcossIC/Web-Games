/** Color math for the texture painter. Pure: hex strings in, hex strings out. */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Reads `#rrggbb`, `#rgb`, with or without the `#`. Throws on anything else. */
export function parseHex(hex: string): Rgb {
  const match = HEX.exec(hex.trim());
  if (!match) {
    throw new Error(`Not a hex color: "${hex}"`);
  }
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((d) => d + d)
      .join('');
  }
  const value = parseInt(digits, 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

function channel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((c) => channel(c).toString(16).padStart(2, '0')).join('')}`;
}

/** `0xRRGGBB`, the number Phaser tints and colors take. */
export function hexToNumber(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (r << 16) | (g << 8) | b;
}

/** a at t = 0, b at t = 1. */
export function mix(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const ca = parseHex(a);
  const cb = parseHex(b);
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * k,
    g: ca.g + (cb.g - ca.g) * k,
    b: ca.b + (cb.b - ca.b) * k,
  });
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, '#ffffff', amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', amount);
}

/** A CSS color for canvas fills: `rgba(r, g, b, a)`. */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}
