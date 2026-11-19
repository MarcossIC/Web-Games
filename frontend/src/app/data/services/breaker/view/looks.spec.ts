import { BreakerTexture, brickTextureKey } from '@app/data/models/breaker/BreakerKeys';
import { toneColor } from '../assets/breaker-themes';
import type { ActiveEffect } from '../engine/types';
import {
  ballLook,
  brickBaseTexture,
  brickOverlays,
  findEffect,
  flashAlpha,
  paddleTextureKey,
  readBreakerFlags,
  readStartSector,
  shardColor,
} from './looks';

describe('looks', () => {
  describe('brickBaseTexture', () => {
    it('paints normal, tough and armored bricks with the theme tone', () => {
      expect(brickBaseTexture('normal', 2, 5)).toBe(brickTextureKey(2, 5));
      expect(brickBaseTexture('tough', 0, 1)).toBe(brickTextureKey(0, 1));
      expect(brickBaseTexture('armored', 4, 3)).toBe(brickTextureKey(4, 3));
    });

    it('gives the special bricks their own art', () => {
      expect(brickBaseTexture('steel', 0, 0)).toBe(BreakerTexture.STEEL);
      expect(brickBaseTexture('explosive', 0, 0)).toBe(BreakerTexture.EXPLOSIVE);
      expect(brickBaseTexture('capsule', 0, 0)).toBe(BreakerTexture.CAPSULE_BRICK);
      expect(brickBaseTexture('prism', 0, 0)).toBe(BreakerTexture.PRISM);
    });
  });

  describe('brickOverlays', () => {
    it('cracks a tough brick at 1 hp', () => {
      expect(brickOverlays('tough', 2)).toEqual({ plate: false, crack: null });
      expect(brickOverlays('tough', 1)).toEqual({ plate: false, crack: BreakerTexture.CRACK_1 });
    });

    it('wears an armored brick down: plate, plate + crack, deep crack', () => {
      expect(brickOverlays('armored', 3)).toEqual({ plate: true, crack: null });
      expect(brickOverlays('armored', 2)).toEqual({ plate: true, crack: BreakerTexture.CRACK_1 });
      expect(brickOverlays('armored', 1)).toEqual({ plate: false, crack: BreakerTexture.CRACK_2 });
    });

    it('leaves the rest alone (steel has hp 1 and never cracks)', () => {
      expect(brickOverlays('normal', 1)).toEqual({ plate: false, crack: null });
      expect(brickOverlays('steel', 1)).toEqual({ plate: false, crack: null });
    });
  });

  it('flashAlpha fades the hit flash over FLASH_MS', () => {
    expect(flashAlpha(0)).toBe(0);
    expect(flashAlpha(120)).toBe(1);
    expect(flashAlpha(60)).toBeCloseTo(0.5, 6);
    expect(flashAlpha(500)).toBe(1);
  });

  it('shardColor uses the tone, and fixed colors for the special bricks', () => {
    expect(shardColor('normal', 1, 2)).toBe(toneColor(1, 2));
    expect(shardColor('explosive', 1, 2)).not.toBe(toneColor(1, 2));
    expect(shardColor('steel', 0, 0)).toBe(shardColor('steel', 3, 7));
  });

  describe('effects', () => {
    const effects: ActiveEffect[] = [
      { kind: 'magnet', remainingMs: 100, durationMs: 1000, stacks: 1 },
      { kind: 'fire', remainingMs: 100, durationMs: 1000, stacks: 1 },
    ];

    it('findEffect finds an active effect without allocating', () => {
      expect(findEffect(effects, 'fire')).toBe(effects[1]);
      expect(findEffect(effects, 'laser')).toBeNull();
    });

    it('paddleTextureKey: laser shows over magnet, magnet over normal', () => {
      expect(paddleTextureKey([])).toBe(BreakerTexture.PADDLE);
      expect(paddleTextureKey(effects)).toBe(BreakerTexture.PADDLE_MAGNET);
      expect(paddleTextureKey([...effects, { kind: 'laser', remainingMs: 1, durationMs: 1, stacks: 1 }])).toBe(
        BreakerTexture.PADDLE_LASER
      );
    });

    it('ballLook: nova over fire over normal', () => {
      expect(ballLook(false, false)).toBe(0);
      expect(ballLook(true, false)).toBe(1);
      expect(ballLook(true, true)).toBe(2);
      expect(ballLook(false, true)).toBe(2);
    });
  });

  describe('readBreakerFlags', () => {
    it('reads ?sheet=1 and ?fps=1 in a dev build', () => {
      expect(readBreakerFlags('?sheet=1', true)).toEqual({ sheet: true, fps: false });
      expect(readBreakerFlags('?fps=1&x=2', true)).toEqual({ sheet: false, fps: true });
      expect(readBreakerFlags('', true)).toEqual({ sheet: false, fps: false });
      expect(readBreakerFlags('?fps=0', true)).toEqual({ sheet: false, fps: false });
    });

    it('ignores them in production (a ?sheet=1 there would leave the page loading forever)', () => {
      expect(readBreakerFlags('?sheet=1&fps=1', false)).toEqual({ sheet: false, fps: false });
    });
  });

  describe('readStartSector', () => {
    it('reads ?sector=N in a dev build (to reach a boss in a review), 1 when absent or bad', () => {
      expect(readStartSector('?sector=5', true)).toBe(5);
      expect(readStartSector('?fps=1&sector=10', true)).toBe(10);
      expect(readStartSector('', true)).toBe(1);
      expect(readStartSector('?sector=abc', true)).toBe(1);
      expect(readStartSector('?sector=0', true)).toBe(1);
      expect(readStartSector('?sector=-4', true)).toBe(1);
      expect(readStartSector('?sector=7.9', true)).toBe(7);
      expect(readStartSector('?sector=5000', true)).toBe(99);
    });

    it('always starts at sector 1 in production', () => {
      expect(readStartSector('?sector=10', false)).toBe(1);
    });
  });
});
