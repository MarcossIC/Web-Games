import { EFFECT_MS } from './config';
import {
  ballSpeedFactor,
  EffectTimers,
  isTimedEffect,
  MercyTracker,
  NEGATIVE_POWER_UPS,
  paddleWidthFactor,
  pickPowerUp,
  POSITIVE_POWER_UPS,
  rotateInto,
  shouldDrop,
  splitCount,
  type DropContext,
} from './powerups';
import { Rng } from './rng';
import type { PowerUpKind, TimedEffectKind } from './types';

function ctx(overrides: Partial<DropContext> = {}): DropContext {
  return {
    sector: 3,
    brickKind: 'normal',
    bricksBrokenInSector: 10,
    dropChance: 0.3,
    mercy: false,
    capsulesFalling: 0,
    ...overrides,
  };
}

function dropRate(context: DropContext, seed = 1, n = 4000): number {
  const rng = new Rng(seed);
  let drops = 0;
  for (let i = 0; i < n; i++) if (shouldDrop(context, rng)) drops++;
  return drops / n;
}

describe('breaker power-ups', () => {
  describe('drops', () => {
    it('drops at the sector chance', () => {
      expect(dropRate(ctx({ dropChance: 0.3 }))).toBeCloseTo(0.3, 1);
    });

    it('always drops from a capsule brick', () => {
      expect(dropRate(ctx({ brickKind: 'capsule', dropChance: 0 }))).toBe(1);
    });

    it('always drops on the first 3 bricks of sector 1, and not after that by force', () => {
      for (const broken of [0, 1, 2]) {
        expect(dropRate(ctx({ sector: 1, bricksBrokenInSector: broken, dropChance: 0 }))).toBe(1);
      }
      expect(dropRate(ctx({ sector: 1, bricksBrokenInSector: 3, dropChance: 0 }))).toBe(0);
      expect(dropRate(ctx({ sector: 2, bricksBrokenInSector: 0, dropChance: 0 }))).toBe(0);
    });

    it('drops 50% more often during mercy', () => {
      expect(dropRate(ctx({ dropChance: 0.3, mercy: true }))).toBeCloseTo(0.45, 1);
    });

    it('never drops with 4 capsules already falling, capsule bricks included', () => {
      expect(dropRate(ctx({ capsulesFalling: 4, dropChance: 1 }))).toBe(0);
      expect(dropRate(ctx({ capsulesFalling: 4, brickKind: 'capsule' }))).toBe(0);
      expect(dropRate(ctx({ capsulesFalling: 3, dropChance: 1 }))).toBe(1);
    });

    it('never drops from steel', () => {
      expect(dropRate(ctx({ brickKind: 'steel', dropChance: 1 }))).toBe(0);
    });
  });

  describe('pickPowerUp', () => {
    function picks(sector: number, negativeWeight: number, n = 3000): Map<PowerUpKind, number> {
      const rng = new Rng(sector * 31 + 7);
      const counts = new Map<PowerUpKind, number>();
      for (let i = 0; i < n; i++) {
        const kind = pickPowerUp(sector, negativeWeight, rng);
        counts.set(kind, (counts.get(kind) ?? 0) + 1);
      }
      return counts;
    }

    it('only picks positives before sector 5, even if asked for negatives', () => {
      const counts = picks(4, 0.25);
      for (const kind of NEGATIVE_POWER_UPS) expect(counts.get(kind) ?? 0).toBe(0);
      for (const kind of POSITIVE_POWER_UPS) expect(counts.get(kind) ?? 0).withContext(kind).toBeGreaterThan(0);
    });

    it('picks negatives at about their weight from sector 5', () => {
      const counts = picks(9, 0.2, 5000);
      const negatives = NEGATIVE_POWER_UPS.reduce((sum, kind) => sum + (counts.get(kind) ?? 0), 0);
      expect(negatives / 5000).toBeCloseTo(0.2, 1);
    });

    it('keeps an extra life rare', () => {
      const counts = picks(3, 0);
      expect((counts.get('life') ?? 0) / 3000).toBeLessThan(0.06);
      expect(counts.get('life') ?? 0).toBeLessThan(counts.get('multi') ?? 0);
    });
  });

  describe('EffectTimers', () => {
    const ended: TimedEffectKind[] = [];
    beforeEach(() => (ended.length = 0));

    const TIMED: TimedEffectKind[] = ['wide', 'laser', 'magnet', 'slow', 'fire', 'barrier', 'shrink', 'fast'];

    it('starts each timed effect with its duration times the sector scale', () => {
      for (const kind of TIMED) {
        const effects = new EffectTimers();
        effects.activate(kind, 1.3, ended);
        expect(effects.has(kind)).withContext(kind).toBeTrue();
        expect(effects.list[0].durationMs).toBeCloseTo(EFFECT_MS[kind] * 1.3, 6);
        expect(effects.list[0].remainingMs).toBeCloseTo(EFFECT_MS[kind] * 1.3, 6);
        expect(effects.list[0].stacks).toBe(1);
      }
    });

    it('ends an effect when its time runs out and reports it', () => {
      const effects = new EffectTimers();
      effects.activate('laser', 1, ended);
      effects.tick(EFFECT_MS.laser - 1, ended);
      expect(effects.has('laser')).toBeTrue();
      effects.tick(1, ended);
      expect(effects.has('laser')).toBeFalse();
      expect(ended).toEqual(['laser']);
      expect(effects.list.length).toBe(0);
    });

    it('refreshes the timer when the same effect is caught again', () => {
      const effects = new EffectTimers();
      effects.activate('slow', 1, ended);
      effects.tick(10000, ended);
      effects.activate('slow', 1, ended);
      expect(effects.list.length).toBe(1);
      expect(effects.get('slow')!.remainingMs).toBe(EFFECT_MS.slow);
    });

    it('stacks wide up to 2', () => {
      const effects = new EffectTimers();
      effects.activate('wide', 1, ended);
      effects.activate('wide', 1, ended);
      effects.activate('wide', 1, ended);
      expect(effects.stacks('wide')).toBe(2);
      expect(paddleWidthFactor(effects)).toBeCloseTo(2, 10);
    });

    it('lets shrink cancel wide and wide cancel shrink', () => {
      const effects = new EffectTimers();
      effects.activate('wide', 1, ended);
      expect(paddleWidthFactor(effects)).toBeCloseTo(1.5, 10);
      effects.activate('shrink', 1, ended);
      expect(effects.has('wide')).toBeFalse();
      expect(ended).toEqual(['wide']);
      expect(paddleWidthFactor(effects)).toBeCloseTo(0.65, 10);
      effects.activate('wide', 1, ended);
      expect(effects.has('shrink')).toBeFalse();
      expect(paddleWidthFactor(effects)).toBeCloseTo(1.5, 10);
    });

    it('lets fast cancel slow and slow cancel fast', () => {
      const effects = new EffectTimers();
      expect(ballSpeedFactor(effects)).toBe(1);
      effects.activate('slow', 1, ended);
      expect(ballSpeedFactor(effects)).toBeCloseTo(0.65, 10);
      effects.activate('fast', 1, ended);
      expect(effects.has('slow')).toBeFalse();
      expect(ballSpeedFactor(effects)).toBeCloseTo(1.25, 10);
      effects.activate('slow', 1, ended);
      expect(effects.has('fast')).toBeFalse();
      expect(ended).toEqual(['slow', 'fast']);
    });

    it('keeps the other effects running side by side', () => {
      const effects = new EffectTimers();
      effects.activate('laser', 1, ended);
      effects.activate('fire', 1, ended);
      effects.activate('barrier', 1, ended);
      effects.activate('magnet', 1, ended);
      expect(effects.list.map((e) => e.kind)).toEqual(['laser', 'fire', 'barrier', 'magnet']);
      effects.tick(EFFECT_MS.fire, ended);
      expect(effects.list.map((e) => e.kind)).toEqual(['laser', 'barrier', 'magnet']);
    });

    it('removes one effect on demand (a barrier used up) and clears them all', () => {
      const effects = new EffectTimers();
      effects.activate('barrier', 1, ended);
      effects.activate('laser', 1, ended);
      expect(effects.remove('barrier')).toBeTrue();
      expect(effects.remove('barrier')).toBeFalse();
      effects.clear(ended);
      expect(effects.list.length).toBe(0);
      expect(ended).toEqual(['laser']);
    });

    it('knows which power-ups are timed', () => {
      for (const kind of TIMED) expect(isTimedEffect(kind)).toBeTrue();
      for (const kind of ['multi', 'life', 'nova'] as const) expect(isTimedEffect(kind)).toBeFalse();
    });
  });

  describe('MercyTracker', () => {
    it('turns on after 2 lives lost within 30 s, for 30 s', () => {
      const mercy = new MercyTracker();
      mercy.lifeLost(1000);
      expect(mercy.active(2000)).toBeFalse();
      mercy.lifeLost(25000);
      expect(mercy.active(25000)).toBeTrue();
      expect(mercy.active(54999)).toBeTrue();
      expect(mercy.active(55000)).toBeFalse();
    });

    it('stays off when the lives are lost far apart', () => {
      const mercy = new MercyTracker();
      mercy.lifeLost(1000);
      mercy.lifeLost(40000);
      expect(mercy.active(40000)).toBeFalse();
    });
  });

  describe('multi and prism splits', () => {
    it('turns each ball into 3 up to the cap of 12', () => {
      expect(splitCount(1, 2, 12)).toBe(2);
      expect(splitCount(4, 2, 12)).toBe(2);
      expect(splitCount(11, 2, 12)).toBe(1);
      expect(splitCount(12, 2, 12)).toBe(0);
    });

    it('rotates a velocity keeping its speed', () => {
      const out = { x: 0, y: 0 };
      rotateInto(0, -500, (20 * Math.PI) / 180, out);
      expect(Math.hypot(out.x, out.y)).toBeCloseTo(500, 8);
      expect(out.x).toBeCloseTo(500 * Math.sin((20 * Math.PI) / 180), 8);
      expect(out.y).toBeLessThan(0);
    });
  });
});
