import { SHIELD_SLOTS } from './boss';
import { BreakerEngine, IDLE_INPUT } from './breaker-engine';
import { BALL, BOSS, CLEARING, GRID, LASER, PADDLE, STEP, WORLD } from './config';
import type { Ball, Boss, BossPellet, BreakerEvent, BreakerInput, Brick } from './types';

type EventOf<T extends BreakerEvent['type']> = Extract<BreakerEvent, { type: T }>;

function input(overrides: Partial<BreakerInput> = {}): BreakerInput {
  return { ...IDLE_INPUT, ...overrides };
}

const LAUNCH = input({ launchPressed: true });
const FRAME = 1000 / 60;

function run(engine: BreakerEngine, ms: number, each: BreakerInput | ((t: number) => BreakerInput) = IDLE_INPUT): BreakerEvent[] {
  const events: BreakerEvent[] = [];
  for (let t = 0; t < ms; t += FRAME) events.push(...engine.update(FRAME, typeof each === 'function' ? each(t) : each));
  return events;
}

function ofType<T extends BreakerEvent['type']>(events: readonly BreakerEvent[], type: T): EventOf<T>[] {
  return events.filter((e): e is EventOf<T> => e.type === type);
}

function ball(engine: BreakerEngine, index = 0): Ball {
  return engine.state.balls[index] as Ball;
}

function boss(engine: BreakerEngine): Boss {
  const b = engine.state.boss;
  if (!b) throw new Error('no boss');
  return b as Boss;
}

function aim(engine: BreakerEngine, x: number, y: number, vx: number, vy: number): Ball {
  if (engine.state.phase === 'serve') engine.update(STEP.MS, LAUNCH);
  const b = ball(engine);
  b.stuck = false;
  b.x = b.prevX = x;
  b.y = b.prevY = y;
  b.vx = vx;
  b.vy = vy;
  return b;
}

function coreCenterX(engine: BreakerEngine): number {
  return boss(engine).x + BOSS.W / 2;
}

function coreBottom(engine: BreakerEngine): number {
  return boss(engine).y + BOSS.H;
}

/** Shield bricks are the ones outside the grid (row -1); `col` is their slot. */
function shields(engine: BreakerEngine): Brick[] {
  return engine.state.bricks.filter((b) => b.row < 0 && b.alive) as Brick[];
}

const EMPTY = '.............';
/** Eight empty rows: bricks under them sit well below the core and its shield. */
const UNDER_CORE: readonly string[] = Array.from({ length: 8 }, () => EMPTY);
/** A normal brick in the right corner, under the core's swing. */
const CORNER = [...UNDER_CORE, '............1'];

/** A boss fight with no shield and a lone corner brick: the core is in the open. */
function openFight(extra: Parameters<typeof BreakerEngine.forTest>[0] = { seed: 1 }): BreakerEngine {
  return BreakerEngine.forTest({ startSector: 5, layout: CORNER, bossShields: false, ...extra });
}

/**
 * Hits the core once off the eye (1 damage), then lets its guard run out.
 * 70 px in from its left edge: even gliding at full speed the core cannot
 * slide the eye (or its edge) under the ball before it arrives.
 */
function hitCore(engine: BreakerEngine): BreakerEvent[] {
  aim(engine, boss(engine).x + 70, coreBottom(engine) + 24, 0, -1);
  return run(engine, 200);
}

describe('BreakerEngine: THE CORE (boss sectors)', () => {
  describe('where it appears', () => {
    it('guards sectors 5 and 10, not 4 nor 6', () => {
      const five = new BreakerEngine({ seed: 1, startSector: 5 }).state.boss!;
      expect(five).toBeTruthy();
      expect(five.number).toBe(1);
      expect(five.hp).toBe(24);
      expect(five.maxHp).toBe(24);
      expect(five.phase).toBe(1);
      expect(five.alive).toBeTrue();
      expect(five.w).toBe(BOSS.W);
      expect(five.h).toBe(BOSS.H);
      expect(five.y).toBe(BOSS.Y);
      expect(five.x + BOSS.W / 2).toBe(WORLD.WIDTH / 2);

      const ten = new BreakerEngine({ seed: 1, startSector: 10 }).state.boss!;
      expect(ten.number).toBe(2);
      expect(ten.hp).toBe(36);

      expect(new BreakerEngine({ seed: 1, startSector: 4 }).state.boss ?? null).toBeNull();
      expect(new BreakerEngine({ seed: 1, startSector: 6 }).state.boss ?? null).toBeNull();
    });

    it('rings it with 8 shield bricks that follow it', () => {
      const engine = new BreakerEngine({ seed: 3, startSector: 5 });
      expect(shields(engine).length).toBe(8);
      engine.update(STEP.MS, LAUNCH);
      run(engine, 2500, () => input({ pointerX: ball(engine)?.x ?? 480 }));
      const core = boss(engine);
      for (const s of shields(engine)) {
        expect(s.x).toBeCloseTo(core.x + SHIELD_SLOTS[s.col].dx, 6);
        expect(s.y).toBeCloseTo(core.y + SHIELD_SLOTS[s.col].dy, 6);
      }
    });

    it('arrives with nextSector from sector 4, and leaves with sector 6', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 4, layout: [...UNDER_CORE, '......1......'] });
      aim(engine, GRID.LEFT + 6 * GRID.STRIDE_X + GRID.BRICK_W / 2, 420, 0, -1);
      run(engine, 300 + CLEARING.MS + 100);
      engine.nextSector();
      expect(engine.state.boss?.number).toBe(1);
      expect(engine.update(1, IDLE_INPUT)).toContain({ type: 'sector-started', sector: 5 });
    });

    it('holds the ceiling still in a boss sector', () => {
      const engine = new BreakerEngine({ seed: 1, startSector: 10 });
      const debris = engine.state.bricks.find((b) => b.row >= 0)!;
      const y = debris.y;
      engine.update(STEP.MS, LAUNCH);
      run(engine, 3000, () => input({ pointerX: ball(engine)?.x ?? 480 }));
      const same = engine.state.bricks.find((b) => b.id === debris.id);
      if (same) expect(same.y).toBe(y);
    });
  });

  describe('hitting the core', () => {
    it('bounces the ball off it and takes 1 damage, then flashes for 120 ms', () => {
      const engine = openFight();
      const events = hitCore(engine);
      const hit = ofType(events, 'boss-hit')[0];
      expect(hit).toBeDefined();
      expect(hit.damage).toBe(BOSS.BALL_DAMAGE);
      expect(hit.weak).toBeFalse();
      expect(hit.hpLeft).toBe(23);
      expect(boss(engine).hp).toBe(23);
      expect(ball(engine).vy).toBeGreaterThan(0);
      expect(engine.state.score).toBeGreaterThan(0);
    });

    it('takes no damage while it flashes', () => {
      const engine = openFight();
      aim(engine, boss(engine).x + 70, coreBottom(engine) + 20, 0, -1);
      run(engine, 50);
      expect(boss(engine).hp).toBe(23);
      expect(boss(engine).invulnMs).toBeGreaterThan(0);
      aim(engine, boss(engine).x + 70, coreBottom(engine) + 20, 0, -1);
      const events = run(engine, 30);
      expect(ofType(events, 'boss-hit')[0].damage).toBe(0);
      expect(boss(engine).hp).toBe(23);
      run(engine, 200);
      hitCore(engine);
      expect(boss(engine).hp).toBe(22);
    });

    it('takes an extra point on the eye, and fire hits harder but still bounces', () => {
      const engine = openFight();
      aim(engine, coreCenterX(engine), coreBottom(engine) + 24, 0, -1);
      const eye = ofType(run(engine, 200), 'boss-hit')[0];
      expect(eye.weak).toBeTrue();
      expect(eye.damage).toBe(BOSS.BALL_DAMAGE + BOSS.WEAK_BONUS);

      engine.applyPowerUp('fire');
      const before = boss(engine).hp;
      const fire = ofType(hitCore(engine), 'boss-hit')[0];
      expect(fire.damage).toBe(BOSS.PIERCE_DAMAGE);
      expect(boss(engine).hp).toBe(before - BOSS.PIERCE_DAMAGE);
      expect(ball(engine).vy).toBeGreaterThan(0);
    });

    it('a 2000 px/s ball never goes through the core over 10 s', () => {
      const engine = openFight({ seed: 5, params: { ballSpeed: 2000 } });
      engine.applyPowerUp('wide');
      aim(engine, coreCenterX(engine) + 50, 500, 0.3, -1);
      let hits = 0;
      for (let t = 0; t < 10000; t += FRAME) {
        const events = engine.update(FRAME, input({ pointerX: ball(engine).x + 25 * Math.sin(t / 300) }));
        hits += ofType(events, 'boss-hit').length;
        const b = ball(engine);
        const core = boss(engine);
        if (!core.alive) break;
        // The ball's center may never come closer to the core than its radius.
        const qx = Math.max(core.x, Math.min(core.x + core.w, b.x));
        const qy = Math.max(core.y, Math.min(core.y + core.h, b.y));
        const inside = Math.hypot(b.x - qx, b.y - qy) < BALL.R - 0.5;
        expect(inside).withContext(`t=${Math.round(t)} ball ${b.x.toFixed(1)},${b.y.toFixed(1)}`).toBeFalse();
      }
      expect(hits).toBeGreaterThan(3);
    });

    it('lasers hurt it too', () => {
      const engine = openFight({ seed: 1, params: { ballSpeed: 60 } });
      aim(engine, 60, 400, 0, -1);
      engine.applyPowerUp('laser');
      const events = run(engine, 1200, input({ pointerX: coreCenterX(engine) + 40, fireHeld: true }));
      const hits = ofType(events, 'boss-hit').filter((h) => h.damage > 0);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].damage).toBe(BOSS.LASER_DAMAGE);
      expect(boss(engine).hp).toBeLessThan(24);
    });
  });

  describe('phases', () => {
    it('changes phase under 60% and 30% hp, dropping capsules each time', () => {
      const engine = openFight();
      const events: BreakerEvent[] = [];
      while (boss(engine).hp > 6) events.push(...hitCore(engine));
      const phases = ofType(events, 'boss-phase');
      expect(phases.map((p) => p.phase)).toEqual([2, 3]);
      expect(boss(engine).phase).toBe(3);
      const spawned = ofType(events, 'capsule-spawned').map((c) => c.kind);
      expect(spawned).toContain('multi');
      expect(spawned).toContain('laser');
      expect(spawned).toContain('fire');
    });
  });

  describe('pellets', () => {
    /** A ball crawling at 60 px/s far from everything: the fight goes on with nothing in the way. */
    function calmFight(): BreakerEngine {
      const engine = openFight({ seed: 2, params: { ballSpeed: 60 } });
      aim(engine, 40, 420, 0, -1);
      return engine;
    }

    function firstPellet(engine: BreakerEngine): BossPellet {
      const events = run(engine, BOSS.FIRST_SHOT_MS + 100);
      expect(ofType(events, 'boss-shot').length).toBe(1);
      return boss(engine).pellets[0] as BossPellet;
    }

    it('fall from the eye at a steady speed after the first 3 s', () => {
      const engine = calmFight();
      const pellets = boss(engine).pellets;
      expect(ofType(run(engine, BOSS.FIRST_SHOT_MS - 200), 'boss-shot').length).toBe(0);
      const shots = ofType(run(engine, 300), 'boss-shot');
      expect(shots.length).toBe(1);
      expect(shots[0].count).toBe(1);
      expect(boss(engine).pellets).toBe(pellets);
      const p = pellets[0] as BossPellet;
      expect(p.vx).toBe(0);
      expect(p.vy).toBeCloseTo(BOSS.PELLET_SPEED[0], 6);
      expect(p.x).toBeCloseTo(shots[0].x, 6);
      expect(shots[0].y).toBeCloseTo(coreBottom(engine), 0);
      const y = p.y;
      engine.update(STEP.MS, IDLE_INPUT);
      expect(p.y).toBeCloseTo(y + (BOSS.PELLET_SPEED[0] * STEP.MS) / 1000, 6);
    });

    it('jam the paddle for 600 ms when they hit it, never costing a life', () => {
      const engine = calmFight();
      const p = firstPellet(engine);
      p.x = p.prevX = engine.state.paddle.x;
      p.y = p.prevY = PADDLE.Y - 12;
      const events = run(engine, 100);
      const hit = ofType(events, 'pellet-hit-paddle')[0];
      expect(hit).toBeDefined();
      expect(hit.stunMs).toBe(BOSS.STUN_MS);
      expect(ofType(events, 'life-lost').length).toBe(0);
      expect(boss(engine).pellets.length).toBe(0);
      expect(engine.state.paddleStunMs).toBeGreaterThan(0);

      const x = engine.state.paddle.x;
      run(engine, 300, input({ moveAxis: 1 }));
      expect(engine.state.paddle.x).toBe(x);
      run(engine, 500, input({ moveAxis: 1 }));
      expect(engine.state.paddle.x).toBeGreaterThan(x + 50);
      expect(engine.state.paddleStunMs).toBe(0);
    });

    it('cannot jam the paddle again while it is jammed, nor right after it is freed', () => {
      const engine = calmFight();
      const first = firstPellet(engine);
      const pellets = boss(engine).pellets as BossPellet[];
      const drop = (q: BossPellet): void => {
        q.x = q.prevX = engine.state.paddle.x;
        q.y = q.prevY = PADDLE.Y - 12;
      };
      const another = (): void => {
        const q = { ...first, alive: true };
        drop(q);
        pellets.push(q);
      };

      drop(first);
      expect(ofType(run(engine, 50), 'pellet-hit-paddle').length).toBe(1);

      // While jammed: the pellet pops on the paddle, the jam is not renewed.
      another();
      let events = run(engine, 50);
      expect(ofType(events, 'pellet-hit-paddle').length).toBe(0);
      expect(ofType(events, 'pellet-destroyed').length).toBe(1);

      run(engine, BOSS.STUN_MS);
      expect(engine.state.paddleStunMs).toBe(0);

      // Just freed: still guarded.
      another();
      events = run(engine, 50);
      expect(ofType(events, 'pellet-hit-paddle').length).toBe(0);
      expect(engine.state.paddleStunMs).toBe(0);

      // Once the guard wears off a pellet jams it again.
      run(engine, BOSS.STUN_GUARD_MS);
      another();
      expect(ofType(run(engine, 50), 'pellet-hit-paddle').length).toBe(1);
    });

    it('are popped by lasers', () => {
      const engine = calmFight();
      const p = firstPellet(engine);
      engine.applyPowerUp('laser');
      const inset = engine.state.paddle.w / 2 - LASER.EDGE_INSET;
      p.x = p.prevX = engine.state.paddle.x - inset;
      p.y = p.prevY = 420;
      const events = run(engine, 400, input({ fireHeld: true }));
      expect(ofType(events, 'pellet-destroyed').length).toBe(1);
      expect(ofType(events, 'pellet-hit-paddle').length).toBe(0);
      expect(boss(engine).pellets.every((q) => q !== p || !q.alive)).toBeTrue();
    });

    it('are gone when the last ball is lost', () => {
      const engine = calmFight();
      firstPellet(engine);
      aim(engine, 60, 726, 0, 1);
      const events = run(engine, 200, input({ pointerX: 900 }));
      expect(ofType(events, 'life-lost').length).toBe(1);
      expect(boss(engine).pellets.length).toBe(0);
    });
  });

  describe('the shield', () => {
    it('an explosive shield takes its neighbors and hurts the core', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 5, layout: CORNER, params: { ballSpeed: 600 } });
      const fuse = shields(engine).find((s) => s.kind === 'explosive' && s.col === 5)!;
      expect(fuse).toBeDefined();
      aim(engine, fuse.x + fuse.w / 2, 400, 0, -1);
      const events = run(engine, 600);
      expect(ofType(events, 'explosion').length).toBeGreaterThan(0);
      const slots = shields(engine).map((s) => s.col);
      expect(slots).not.toContain(5);
      expect(slots).not.toContain(4);
      expect(slots).not.toContain(0);
      expect(boss(engine).hp).toBe(24 - BOSS.EXPLOSIVE_DAMAGE);
    });

    it('grows back one brick at a time when the core goes untouched', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 5, layout: CORNER, params: { ballSpeed: 300 } });
      const slot1 = shields(engine).find((s) => s.col === 1)!;
      const oldId = slot1.id;
      aim(engine, slot1.x + slot1.w / 2, slot1.y + slot1.h + 30, 0, -1);
      let events = run(engine, 300);
      expect(ofType(events, 'brick-destroyed').some((e) => e.brickId === oldId)).toBeTrue();
      expect(shields(engine).some((s) => s.col === 1)).toBeFalse();

      events = run(engine, BOSS.SHIELD_REGEN_IDLE_MS + BOSS.SHIELD_REGEN_EVERY_MS + 500, () => {
        // Keep the ball low and out of the way so the core stays untouched.
        const b = ball(engine);
        if (b && !b.stuck && b.y < 400) {
          b.y = b.prevY = 600;
          b.vy = Math.abs(b.vy);
        }
        // And no pellet ever reaches the paddle: a jam could cost the run.
        for (const p of boss(engine).pellets) (p as BossPellet).y = 2000;
        return input({ pointerX: b?.x ?? 480, launchPressed: true });
      });
      const restored = ofType(events, 'shield-restored');
      expect(restored.length).toBeGreaterThan(0);
      const back = shields(engine).find((s) => s.col === 1)!;
      expect(back).toBeDefined();
      expect(back.id).toBe(restored[0].brickId);
      expect(back.id).not.toBe(oldId);
      expect(back.hp).toBe(back.maxHp);
    });

    it('does not grow back while the ball waits on the paddle to be served', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 5, layout: CORNER, params: { ballSpeed: 300 } });
      const slot1 = shields(engine).find((s) => s.col === 1)!;
      aim(engine, slot1.x + slot1.w / 2, slot1.y + slot1.h + 30, 0, -1);
      run(engine, 300);
      expect(shields(engine).some((s) => s.col === 1)).toBeFalse();

      aim(engine, 60, 726, 0, 1);
      expect(ofType(run(engine, 200, input({ pointerX: 900 })), 'life-lost').length).toBe(1);
      expect(engine.state.phase).toBe('serve');

      const events = run(engine, BOSS.SHIELD_REGEN_IDLE_MS + BOSS.SHIELD_REGEN_EVERY_MS * 2);
      expect(engine.state.phase).toBe('serve');
      expect(ofType(events, 'shield-restored').length).toBe(0);
      expect(shields(engine).some((s) => s.col === 1)).toBeFalse();
    });

    it('breaking every brick does not clear the sector while the core lives', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 5, layout: [...UNDER_CORE, '......1......'], bossShields: false });
      const brick = engine.state.bricks.find((b) => b.row >= 0)!;
      aim(engine, brick.x + brick.w / 2, brick.y + brick.h + 30, 0, -1);
      const events = run(engine, 300);
      expect(ofType(events, 'brick-destroyed').length).toBe(1);
      expect(ofType(events, 'last-brick').length).toBe(0);
      expect(engine.state.phase).toBe('playing');
    });
  });

  describe('defeat', () => {
    it('explodes at 0 hp, shatters what is left, then clears the sector with the boss bonus', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 5, layout: CORNER, bossShields: false, bossHp: 1 });
      const scoreBefore = engine.state.score;
      let events = hitCore(engine);
      const down = ofType(events, 'boss-defeated')[0];
      expect(down).toBeDefined();
      expect(down.number).toBe(1);
      expect(down.bonus).toBe(5000);
      expect(boss(engine).alive).toBeFalse();
      expect(boss(engine).hp).toBe(0);
      expect(ofType(events, 'brick-destroyed').length).toBe(1);
      expect(engine.state.bricks.filter((b) => b.alive).length).toBe(0);
      const last = ofType(events, 'last-brick')[0];
      expect(last.x).toBeCloseTo(coreCenterX(engine), 6);
      expect(engine.state.phase).toBe('clearing');

      events = run(engine, CLEARING.MS + 100);
      expect(ofType(events, 'sector-cleared').length).toBe(0);
      events = run(engine, BOSS.CLEARING_MS - CLEARING.MS + 100);
      const cleared = ofType(events, 'sector-cleared')[0];
      expect(cleared).toBeDefined();
      expect(cleared.bossBonus).toBe(5000);
      expect(cleared.bonus).toBeGreaterThanOrEqual(5000 + 5000);
      expect(engine.state.score).toBeGreaterThanOrEqual(scoreBefore + cleared.bonus);
      expect(engine.state.phase).toBe('cleared');

      engine.nextSector();
      expect(engine.state.boss ?? null).toBeNull();
      expect(engine.state.sector).toBe(6);
    });

    it('stops shooting once destroyed', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 5, layout: CORNER, bossShields: false, bossHp: 1 });
      hitCore(engine);
      const events = run(engine, BOSS.CLEARING_MS + 200);
      expect(ofType(events, 'boss-shot').length).toBe(0);
      expect(boss(engine).pellets.length).toBe(0);
    });
  });

  describe('determinism', () => {
    it('replays the same boss fight from the same seed and inputs', () => {
      const a = new BreakerEngine({ seed: 21, startSector: 5 });
      const b = new BreakerEngine({ seed: 21, startSector: 5 });
      const ea: BreakerEvent[] = [];
      const eb: BreakerEvent[] = [];
      for (let f = 0; f < 60 * 25; f++) {
        const chase = a.state.balls[0];
        const step: BreakerInput = {
          moveAxis: 0,
          pointerX: chase ? chase.x + 18 * Math.sin(f / 31) : null,
          launchPressed: f % 90 === 1,
          fireHeld: f % 40 < 20,
          overdrivePressed: f % 300 === 7,
        };
        ea.push(...a.update(FRAME, step));
        eb.push(...b.update(FRAME, step));
      }
      expect(JSON.stringify(ea)).toBe(JSON.stringify(eb));
      expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
      expect(ea.some((e) => e.type === 'boss-shot')).toBeTrue();
      expect(ea.some((e) => e.type === 'boss-hit' || e.type === 'brick-destroyed')).toBeTrue();
    });
  });
});
