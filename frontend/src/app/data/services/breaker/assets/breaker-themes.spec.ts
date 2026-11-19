import { BREAKER_POWER_UP_INFO } from '@app/data/models/breaker/BreakerPowerUpInfo';
import { BREAKER_THEME_COUNT, BREAKER_TONE_COUNT, brickTextureKey } from '@app/data/models/breaker/BreakerKeys';
import { parseHex } from './color';
import { BREAKER_THEMES, CAPSULE_STYLES, isNegativePowerUp, themeAt, toneColor, toneHex } from './breaker-themes';
import { PowerUpKind } from '../engine/types';
import { NEGATIVE_POWER_UPS } from '../engine/powerups';

const ALL_POWER_UPS: PowerUpKind[] = [
  'multi',
  'wide',
  'laser',
  'magnet',
  'slow',
  'fire',
  'barrier',
  'life',
  'nova',
  'shrink',
  'fast',
];

describe('breaker themes', () => {
  it('has as many themes as the keys expect, each with 8 distinct valid tones and an accent', () => {
    expect(BREAKER_THEMES.length).toBe(BREAKER_THEME_COUNT);
    expect(BREAKER_THEME_COUNT).toBeGreaterThanOrEqual(4);

    for (const theme of BREAKER_THEMES) {
      expect(theme.tones.length).withContext(theme.name).toBe(BREAKER_TONE_COUNT);
      expect(new Set(theme.tones.map((t) => t.toLowerCase())).size).withContext(theme.name).toBe(BREAKER_TONE_COUNT);
      for (const tone of [...theme.tones, theme.accent]) {
        expect(() => parseHex(tone)).withContext(`${theme.name} ${tone}`).not.toThrow();
      }
    }
  });

  it('starts with the site palette, so sector 1 looks like the rest of Game Galaxy', () => {
    expect(BREAKER_THEMES[0].tones).toEqual([
      '#ff2e88',
      '#ff9a3d',
      '#ffe14a',
      '#5dfc9a',
      '#5ee6ff',
      '#66b2ff',
      '#b78bff',
      '#ff5c5c',
    ]);
  });

  it('wraps any theme and tone index, so a sector past the last theme still draws', () => {
    expect(themeAt(BREAKER_THEME_COUNT)).toBe(BREAKER_THEMES[0]);
    expect(themeAt(-1)).toBe(BREAKER_THEMES[BREAKER_THEME_COUNT - 1]);
    expect(toneHex(0, BREAKER_TONE_COUNT + 2)).toBe(BREAKER_THEMES[0].tones[2]);
    expect(toneHex(Number.NaN, Number.NaN)).toBe(BREAKER_THEMES[0].tones[0]);
  });

  it('gives the tint number of a tone for particles', () => {
    expect(toneColor(0, 0)).toBe(0xff2e88);
  });

  it('wraps the brick texture key the same way', () => {
    expect(brickTextureKey(0, 0)).toBe('brick-0-0');
    expect(brickTextureKey(BREAKER_THEME_COUNT + 1, BREAKER_TONE_COUNT + 3)).toBe('brick-1-3');
    expect(brickTextureKey(-1, -1)).toBe(`brick-${BREAKER_THEME_COUNT - 1}-${BREAKER_TONE_COUNT - 1}`);
    expect(brickTextureKey(Number.NaN, 2.7)).toBe('brick-0-2');
  });

  it('styles every power-up, and marks only shrink and fast as negative', () => {
    for (const kind of ALL_POWER_UPS) {
      expect(CAPSULE_STYLES[kind]).withContext(kind).toBeDefined();
      expect(() => parseHex(CAPSULE_STYLES[kind].color)).withContext(kind).not.toThrow();
    }
    expect(ALL_POWER_UPS.filter(isNegativePowerUp)).toEqual(['shrink', 'fast']);
  });

  it('teaches in the How to play legend the same color and hazard the capsule paints', () => {
    for (const kind of ALL_POWER_UPS) {
      expect(BREAKER_POWER_UP_INFO[kind].color).withContext(kind).toBe(CAPSULE_STYLES[kind].color);
      expect(BREAKER_POWER_UP_INFO[kind].hazard).withContext(kind).toBe(CAPSULE_STYLES[kind].negative);
      expect(BREAKER_POWER_UP_INFO[kind].hazard).withContext(kind).toBe((NEGATIVE_POWER_UPS as readonly string[]).includes(kind));
    }
  });
});
