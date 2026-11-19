import { BREAKER_POWER_UP_INFO } from '@app/data/models/breaker/BreakerPowerUpInfo';
import { BREAKER_THEME_COUNT, BREAKER_TONE_COUNT } from '@app/data/models/breaker/BreakerKeys';
import type { PowerUpKind } from '../engine/types';
import { hexToNumber } from './color';

/**
 * Brick palettes. `BreakerState.theme` picks one (wrapping), `Brick.tone` picks a color
 * in it (wrapping). Theme 0 is the site palette (Arcade Terminal MK-II); the others are
 * built from it and keep every tone bright enough to read on the #07060d background.
 */
export interface BreakerTheme {
  readonly name: string;
  /** BREAKER_TONE_COUNT colors, #rrggbb. */
  readonly tones: readonly string[];
  /** The theme's lead color, for the scene's own glows (sector card, grid tint, flashes). */
  readonly accent: string;
}

export const BREAKER_THEMES: readonly BreakerTheme[] = [
  {
    name: 'arcade',
    tones: ['#ff2e88', '#ff9a3d', '#ffe14a', '#5dfc9a', '#5ee6ff', '#66b2ff', '#b78bff', '#ff5c5c'],
    accent: '#5ee6ff',
  },
  {
    name: 'synthwave',
    tones: ['#ff2e88', '#ff4fd8', '#c86bff', '#8a5cff', '#5b6cff', '#ff6b9d', '#ff9a3d', '#ffd166'],
    accent: '#ff2e88',
  },
  {
    name: 'glacier',
    tones: ['#5ee6ff', '#66b2ff', '#8fd3ff', '#b7f3ff', '#7c9cff', '#b78bff', '#3dd6c6', '#e6f7ff'],
    accent: '#8fd3ff',
  },
  {
    name: 'toxic',
    tones: ['#5dfc9a', '#b6ff4a', '#ffe14a', '#3dffd0', '#5ee6ff', '#9dff6b', '#d4ff3d', '#2ee87a'],
    accent: '#5dfc9a',
  },
  {
    name: 'inferno',
    tones: ['#ff5c5c', '#ff9a3d', '#ffe14a', '#ff2e88', '#ff7a3d', '#ffb84a', '#ff4060', '#ffd27a'],
    accent: '#ff9a3d',
  },
  {
    name: 'aurora',
    tones: ['#5dfc9a', '#5ee6ff', '#b78bff', '#ff2e88', '#66b2ff', '#3dffd0', '#ff9ad5', '#c6ff7a'],
    accent: '#b78bff',
  },
];

function wrap(value: number, count: number): number {
  const index = Number.isFinite(value) ? Math.floor(value) : 0;
  return ((index % count) + count) % count;
}

export function themeAt(theme: number): BreakerTheme {
  return BREAKER_THEMES[wrap(theme, BREAKER_THEME_COUNT)];
}

export function toneHex(theme: number, tone: number): string {
  return themeAt(theme).tones[wrap(tone, BREAKER_TONE_COUNT)];
}

/** 0xRRGGBB of a brick tone: tint shards and sparks with it. */
export function toneColor(theme: number, tone: number): number {
  return hexToNumber(toneHex(theme, tone));
}

export interface CapsuleStyle {
  readonly color: string;
  /** Shrink and fast: drawn dark red with hazard stripes, played as a descending buzz. */
  readonly negative: boolean;
}

/** Derived from the model's single description of each power-up, so the sheet and the scene cannot drift. */
export const CAPSULE_STYLES: Readonly<Record<PowerUpKind, CapsuleStyle>> = Object.fromEntries(
  Object.entries(BREAKER_POWER_UP_INFO).map(([kind, info]) => [kind, { color: info.color, negative: info.hazard }])
) as Record<PowerUpKind, CapsuleStyle>;

export function isNegativePowerUp(kind: PowerUpKind): boolean {
  return CAPSULE_STYLES[kind].negative;
}
