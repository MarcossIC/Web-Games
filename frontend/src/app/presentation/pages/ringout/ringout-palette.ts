import type { PieceColor } from '@app/data/services/ringout/engine/types';

/** A color of the board in its three tones: the tube, its shaded edge and its shine. */
export interface Tone {
  readonly base: string;
  readonly dark: string;
  readonly light: string;
}

/** Neon on the dark backdrop of the site. */
const BASES: Record<PieceColor, string> = {
  orange: '#ff9a3d',
  blue: '#4f9dff',
  purple: '#a874ff',
  green: '#45dc84',
  red: '#ff5468',
  teal: '#2ed6c4',
  yellow: '#ffd23f',
  pink: '#ff5fb7',
  navy: '#6a74ff',
  lime: '#b6f03c',
};

export const TONES: Record<PieceColor, Tone> = Object.fromEntries(
  (Object.keys(BASES) as PieceColor[]).map((color) => [
    color,
    { base: BASES[color], dark: mix(BASES[color], '#0b0716', 0.5), light: mix(BASES[color], '#ffffff', 0.6) },
  ])
) as Record<PieceColor, Tone>;

/** `a` moved towards `b` by `amount` (0 to 1). */
export function mix(a: string, b: string, amount: number): string {
  const pa = parse(a);
  const pb = parse(b);
  const channel = (i: number) => Math.round(pa[i] + (pb[i] - pa[i]) * amount);
  return `#${[0, 1, 2].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`;
}

function parse(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
