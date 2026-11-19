import {
  bossBonus,
  bossMaxHp,
  bossNumber,
  bossPhaseFor,
  glideEase,
  isBossSector,
  phaseCapsules,
  SHIELD_NEIGHBORS,
  SHIELD_REGEN_ORDER,
  SHIELD_SLOTS,
  shieldKinds,
  volleyAngle,
  volleyCount,
} from './boss';
import { BOSS, GRID, WORLD } from './config';

describe('boss rules', () => {
  it('puts a boss in every 5th sector only', () => {
    expect([1, 2, 3, 4, 6, 7, 9, 11, 14, 16].some(isBossSector)).toBeFalse();
    expect([5, 10, 15, 20, 50].every(isBossSector)).toBeTrue();
    expect(isBossSector(0)).toBeFalse();
    expect(bossNumber(5)).toBe(1);
    expect(bossNumber(10)).toBe(2);
    expect(bossNumber(15)).toBe(3);
    expect(bossNumber(4)).toBe(0);
  });

  it('grows its hp and its bonus with the boss number', () => {
    expect(bossMaxHp(1)).toBe(24);
    expect(bossMaxHp(2)).toBe(36);
    expect(bossMaxHp(3)).toBe(48);
    expect(bossBonus(1)).toBe(5000);
    expect(bossBonus(3)).toBe(15000);
  });

  it('changes phase at 60% and 30% of its hp', () => {
    expect(bossPhaseFor(24, 24)).toBe(1);
    expect(bossPhaseFor(15, 24)).toBe(1);
    expect(bossPhaseFor(14, 24)).toBe(2);
    expect(bossPhaseFor(8, 24)).toBe(2);
    expect(bossPhaseFor(7, 24)).toBe(3);
    expect(bossPhaseFor(0, 24)).toBe(3);
  });

  it('shoots more pellets per volley in later phases, phase 3 aiming at the paddle', () => {
    expect([volleyCount(1), volleyCount(2), volleyCount(3)]).toEqual([1, 2, 3]);
    expect(volleyAngle(1, 0, 0.5)).toBe(0);
    const spread = (BOSS.PELLET_SPREAD_DEG * Math.PI) / 180;
    expect(volleyAngle(2, 0, 0.5)).toBeCloseTo(-spread / 2, 10);
    expect(volleyAngle(2, 1, 0.5)).toBeCloseTo(spread / 2, 10);
    expect(volleyAngle(3, 1, 0.3)).toBeCloseTo(0.3, 10);
    expect(volleyAngle(3, 0, 0.3)).toBeCloseTo(0.3 - spread, 10);
    // The aim is capped, so a pellet never flies flat.
    const cap = (BOSS.MAX_AIM_DEG * Math.PI) / 180;
    expect(volleyAngle(3, 1, 2)).toBeCloseTo(cap, 10);
  });

  it('drops generous capsules when a phase starts', () => {
    expect(phaseCapsules(2)).toEqual(['multi', 'laser']);
    expect(phaseCapsules(3)).toEqual(['fire', 'multi']);
    expect(phaseCapsules(1)).toEqual([]);
  });

  it('rings the core with 8 shield bricks that never overlap it or each other', () => {
    expect(SHIELD_SLOTS.length).toBe(8);
    const cx = BOSS.MIN_CENTER_X;
    const x0 = cx - BOSS.W / 2;
    const rects = SHIELD_SLOTS.map((s) => ({ x: x0 + s.dx, y: BOSS.Y + s.dy, w: GRID.BRICK_W, h: GRID.BRICK_H }));
    type Rect = { x: number; y: number; w: number; h: number };
    const core: Rect = { x: x0, y: BOSS.Y, w: BOSS.W, h: BOSS.H };
    const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    rects.forEach((r, i) => {
      expect(overlap(r, core)).withContext(`slot ${i}`).toBeFalse();
      rects.forEach((q, j) => {
        if (i !== j) expect(overlap(r, q)).withContext(`slots ${i} ${j}`).toBeFalse();
      });
    });
    // At both ends of its swing every shield stays inside the walls.
    for (const center of [BOSS.MIN_CENTER_X, BOSS.MAX_CENTER_X]) {
      for (const s of SHIELD_SLOTS) {
        const left = center - BOSS.W / 2 + s.dx;
        expect(left).toBeGreaterThanOrEqual(WORLD.LEFT_WALL_X);
        expect(left + GRID.BRICK_W).toBeLessThanOrEqual(WORLD.RIGHT_WALL_X);
      }
    }
    // The bottom row covers the eye.
    const eyeL = cx - BOSS.WEAK_W / 2;
    const eyeR = cx + BOSS.WEAK_W / 2;
    const under = rects.filter((r) => r.y >= BOSS.Y + BOSS.H && r.x < eyeR && r.x + r.w > eyeL);
    expect(under.length).toBeGreaterThan(0);
  });

  it('links neighbor shields both ways and regrows every slot once', () => {
    SHIELD_NEIGHBORS.forEach((list, i) => {
      for (const j of list) expect(SHIELD_NEIGHBORS[j]).withContext(`${i} -> ${j}`).toContain(i);
    });
    expect([...SHIELD_REGEN_ORDER].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('hardens the shield with each boss, with explosives at the sides', () => {
    const first = shieldKinds(1);
    const third = shieldKinds(3);
    expect(first.length).toBe(8);
    expect(first.filter((k) => k === 'explosive').length).toBe(2);
    expect(first).not.toContain('steel');
    const hp = (kinds: readonly string[]) => kinds.filter((k) => k === 'tough' || k === 'armored').length;
    expect(hp(third)).toBeGreaterThan(hp(first));
    expect(third).toContain('armored');
  });

  it('eases a glide from 0 to 1 smoothly', () => {
    expect(glideEase(0)).toBe(0);
    expect(glideEase(1)).toBe(1);
    expect(glideEase(0.5)).toBeCloseTo(0.5, 10);
    expect(glideEase(-1)).toBe(0);
    expect(glideEase(2)).toBe(1);
    expect(glideEase(0.1)).toBeLessThan(0.1);
  });
});
