import { DROPS } from './config';
import { DIFFICULTY, isSpecialSector, sectorParams } from './difficulty';
import { HANDCRAFTED_SECTORS, parseLayout } from './levels';

const SECTORS = Array.from({ length: 50 }, (_, i) => i + 1);

describe('breaker difficulty', () => {
  it('starts very easy in sector 1', () => {
    const p = sectorParams(1);
    expect(p.ballSpeed).toBe(340);
    expect(p.paddleWidth).toBe(170);
    expect(p.dropChance).toBeCloseTo(0.42, 10);
    expect(p.durationScale).toBeCloseTo(1.3, 10);
    expect(p.negativeWeight).toBe(0);
    expect(p.rowMotionAmplitude).toBe(0);
    expect(p.ceilingDescent).toBe(0);
    expect(p.brickMix.normal).toBeGreaterThan(0.9);
    expect(p.brickMix.steel).toBe(0);
    expect(p.brickMix.armored).toBe(0);
  });

  it('follows the plan: +7.5% speed, -6 px of paddle, -0.03 drop chance per sector', () => {
    expect(sectorParams(2).ballSpeed).toBeCloseTo(340 * 1.075, 6);
    expect(sectorParams(3).paddleWidth).toBe(158);
    expect(sectorParams(4).dropChance).toBeCloseTo(0.33, 10);
  });

  it('showers sector 1 with capsules: at least 10 expected from its bricks, whatever variant is drawn', () => {
    // Capsule bricks always drop, the first bricks broken are guaranteed, the rest roll the drop chance.
    HANDCRAFTED_SECTORS[1]!.forEach((rows, i) => {
      const level = parseLayout(rows, 1);
      const capsuleBricks = level.cells.filter((c) => c.kind === 'capsule').length;
      const rolled = level.cells.length - capsuleBricks - DROPS.GUARANTEED_FIRST_BRICKS;
      const expected = capsuleBricks + DROPS.GUARANTEED_FIRST_BRICKS + rolled * sectorParams(1).dropChance;
      expect(expected).withContext(`variant ${i}`).toBeGreaterThanOrEqual(10);
    });
  });

  it('reaches top ball speed at sector 10, not before (a bot showed +6% was flat until the boss of 10)', () => {
    expect(sectorParams(9).ballSpeed).toBeLessThan(DIFFICULTY.BALL_SPEED.MAX);
    expect(sectorParams(10).ballSpeed).toBe(DIFFICULTY.BALL_SPEED.MAX);
  });

  it('brings the ceiling down at least a brick row (30 px) every 20 s from sector 8', () => {
    expect(sectorParams(8).ceilingDescent * 20).toBeGreaterThanOrEqual(30);
  });

  it('lowers the effect durations to x1.0 by sector 6 and keeps them there', () => {
    expect(sectorParams(6).durationScale).toBeCloseTo(1, 10);
    expect(sectorParams(20).durationScale).toBeCloseTo(1, 10);
    expect(sectorParams(3).durationScale).toBeGreaterThan(1);
  });

  it('brings negative capsules from sector 5, row motion from 6 and the ceiling from 8', () => {
    expect(sectorParams(4).negativeWeight).toBe(0);
    expect(sectorParams(5).negativeWeight).toBeGreaterThan(0);
    expect(sectorParams(5).rowMotionAmplitude).toBe(0);
    expect(sectorParams(6).rowMotionAmplitude).toBeGreaterThan(0);
    expect(sectorParams(6).rowMotionSpeed).toBeGreaterThan(0);
    expect(sectorParams(7).ceilingDescent).toBe(0);
    expect(sectorParams(8).ceilingDescent).toBeGreaterThan(0);
  });

  it('only gets harder from one sector to the next', () => {
    for (let s = 2; s <= 50; s++) {
      const a = sectorParams(s - 1);
      const b = sectorParams(s);
      const at = `sector ${s}`;
      expect(b.ballSpeed).withContext(at).toBeGreaterThanOrEqual(a.ballSpeed);
      expect(b.paddleWidth).withContext(at).toBeLessThanOrEqual(a.paddleWidth);
      expect(b.dropChance).withContext(at).toBeLessThanOrEqual(a.dropChance);
      expect(b.durationScale).withContext(at).toBeLessThanOrEqual(a.durationScale);
      expect(b.negativeWeight).withContext(at).toBeGreaterThanOrEqual(a.negativeWeight);
      expect(b.rowMotionAmplitude).withContext(at).toBeGreaterThanOrEqual(a.rowMotionAmplitude);
      expect(b.rowMotionSpeed).withContext(at).toBeGreaterThanOrEqual(a.rowMotionSpeed);
      expect(b.ceilingDescent).withContext(at).toBeGreaterThanOrEqual(a.ceilingDescent);
      expect(b.brickMix.normal).withContext(at).toBeLessThanOrEqual(a.brickMix.normal);
      expect(b.parTimeMs).withContext(at).toBeGreaterThanOrEqual(a.parTimeMs);
    }
  });

  it('holds every cap by sector 50', () => {
    const p = sectorParams(50);
    expect(p.ballSpeed).toBe(DIFFICULTY.BALL_SPEED.MAX);
    expect(p.ballSpeed).toBe(620);
    expect(p.paddleWidth).toBe(112);
    expect(p.dropChance).toBeCloseTo(0.12, 10);
    expect(p.negativeWeight).toBeCloseTo(0.25, 10);
    expect(p.rowMotionAmplitude).toBe(DIFFICULTY.ROW_MOTION.MAX_AMPLITUDE);
    expect(p.ceilingDescent).toBe(DIFFICULTY.CEILING.MAX_RATE);
    expect(p.parTimeMs).toBe(DIFFICULTY.PAR.MAX_MS);
    expect(p.brickMix.steel).toBeLessThanOrEqual(0.35);
    expect(p.brickMix.normal).toBeGreaterThanOrEqual(DIFFICULTY.MIX.MIN_NORMAL);
  });

  it('gives a brick mix that adds up to 1 with no negative weight', () => {
    for (const s of SECTORS) {
      const mix = sectorParams(s).brickMix;
      const values = Object.values(mix);
      expect(values.every((v) => v >= 0)).withContext(`sector ${s}`).toBeTrue();
      expect(values.reduce((a, b) => a + b, 0)).withContext(`sector ${s}`).toBeCloseTo(1, 10);
    }
  });

  it('treats sector 0 or below as sector 1', () => {
    expect(sectorParams(0)).toEqual(sectorParams(1));
    expect(sectorParams(-3)).toEqual(sectorParams(1));
  });

  it('marks every 5th sector as special', () => {
    expect(SECTORS.filter(isSpecialSector).slice(0, 4)).toEqual([5, 10, 15, 20]);
  });
});
