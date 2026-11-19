import { BreakerEngine, IDLE_INPUT } from './breaker-engine';
import { BALL, CEILING, CLEARING, EFFECT_MS, EFFECTS, GRID, LASER, OVERDRIVE, PADDLE, STEP, WORLD } from './config';
import { sectorParams } from './difficulty';
import { Rng } from './rng';
import { SCORE } from './scoring';
import type { Ball, BreakerEvent, BreakerInput, Brick } from './types';

type EventOf<T extends BreakerEvent['type']> = Extract<BreakerEvent, { type: T }>;

function input(overrides: Partial<BreakerInput> = {}): BreakerInput {
  return { ...IDLE_INPUT, ...overrides };
}

const LAUNCH = input({ launchPressed: true });

/** Runs `ms` of frames of 1/60 s and returns every event, copied out of the reused array. */
function run(engine: BreakerEngine, ms: number, each: BreakerInput | ((t: number) => BreakerInput) = IDLE_INPUT): BreakerEvent[] {
  const events: BreakerEvent[] = [];
  const frame = 1000 / 60;
  for (let t = 0; t < ms; t += frame) {
    events.push(...engine.update(frame, typeof each === 'function' ? each(t) : each));
  }
  return events;
}

function ofType<T extends BreakerEvent['type']>(events: readonly BreakerEvent[], type: T): EventOf<T>[] {
  return events.filter((e): e is EventOf<T> => e.type === type);
}

function ball(engine: BreakerEngine, index = 0): Ball {
  return engine.state.balls[index] as Ball;
}

/** Launches, then puts the ball at (x, y) heading along (vx, vy); the engine keeps the speed it wants. */
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

function brickAt(engine: BreakerEngine, col: number, row: number): Brick | undefined {
  return engine.state.bricks.find((b) => b.col === col && b.row === row) as Brick | undefined;
}

/** Center x of a grid column. */
function colX(col: number): number {
  return GRID.LEFT + col * GRID.STRIDE_X + GRID.BRICK_W / 2;
}

/** Bottom edge of a grid row. */
function rowBottom(row: number): number {
  return GRID.TOP + row * GRID.STRIDE_Y + GRID.BRICK_H;
}

/** A layout with one normal brick far in the top-right corner, out of the way. */
const CORNER = ['............1'];

describe('BreakerEngine', () => {
  describe('start and serve', () => {
    it('runs neither the run clock nor the par clock while the ball waits to be served', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      run(engine, 3000);
      expect(engine.state.phase).toBe('serve');
      expect(engine.state.runTimeMs).toBe(0);
      expect(engine.state.sectorTimeMs).toBe(0);
      engine.update(STEP.MS, LAUNCH);
      run(engine, 500);
      expect(engine.state.sectorTimeMs).toBeGreaterThan(400);
      expect(engine.state.runTimeMs).toBe(engine.state.sectorTimeMs);
    });

    it('starts sector 1 in serve with 3 lives and a ball on the center of the paddle', () => {
      const engine = new BreakerEngine({ seed: 1 });
      const s = engine.state;
      expect(s.phase).toBe('serve');
      expect(s.sector).toBe(1);
      expect(s.lives).toBe(3);
      expect(s.score).toBe(0);
      expect(s.balls.length).toBe(1);
      expect(s.balls[0].stuck).toBeTrue();
      expect(s.balls[0].x).toBeCloseTo(s.paddle.x, 6);
      expect(s.balls[0].y).toBeCloseTo(PADDLE.Y - BALL.R, 0);
      expect(s.paddle.x).toBe(WORLD.WIDTH / 2);
      expect(s.paddle.w).toBe(sectorParams(1).paddleWidth);
      expect(s.bricks.length).toBeGreaterThan(20);
      expect(s.theme).toBe(0);
      expect(s.parTimeMs).toBe(sectorParams(1).parTimeMs);
    });

    it('starts in the sector asked for', () => {
      const engine = new BreakerEngine({ seed: 1, startSector: 4 });
      expect(engine.state.sector).toBe(4);
      expect(engine.state.paddle.w).toBe(sectorParams(4).paddleWidth);
    });

    it('says the sector started on the first update', () => {
      const engine = new BreakerEngine({ seed: 1 });
      expect(engine.update(1, IDLE_INPUT)).toContain({ type: 'sector-started', sector: 1 });
      expect(engine.update(1, IDLE_INPUT).length).toBe(0);
    });

    it('carries the ball with the paddle while serving', () => {
      const engine = new BreakerEngine({ seed: 1 });
      run(engine, 300, input({ moveAxis: 1 }));
      expect(engine.state.paddle.x).toBeGreaterThan(WORLD.WIDTH / 2 + 50);
      expect(engine.state.balls[0].x).toBeCloseTo(engine.state.paddle.x, 6);
      expect(engine.state.phase).toBe('serve');
    });

    it('launches the ball upwards on launch and starts the rally', () => {
      const engine = new BreakerEngine({ seed: 1 });
      const events = engine.update(STEP.MS, LAUNCH);
      expect(events.some((e) => e.type === 'ball-launched')).toBeTrue();
      expect(engine.state.phase).toBe('playing');
      const b = engine.state.balls[0];
      expect(b.stuck).toBeFalse();
      expect(b.vy).toBeLessThan(0);
      expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(sectorParams(1).ballSpeed, 3);
    });
  });

  describe('the fixed step', () => {
    /** The sector clock counts fixed steps, but only while playing: serve first. */
    function launched(): BreakerEngine {
      const engine = new BreakerEngine({ seed: 1 });
      engine.update(STEP.MS, LAUNCH);
      expect(engine.state.phase).toBe('playing');
      expect(engine.state.sectorTimeMs).toBe(0);
      return engine;
    }

    it('runs 2 fixed steps for a frame of 16.67 ms and leaves alpha in [0, 1)', () => {
      const engine = launched();
      engine.update(16.67, IDLE_INPUT);
      expect(engine.state.sectorTimeMs).toBeCloseTo(2 * STEP.MS, 6);
      expect(engine.state.alpha).toBeGreaterThanOrEqual(0);
      expect(engine.state.alpha).toBeLessThan(1);
    });

    it('carries short frames over until a step is due', () => {
      const engine = launched();
      engine.update(5, IDLE_INPUT);
      expect(engine.state.sectorTimeMs).toBe(0);
      expect(engine.state.alpha).toBeCloseTo(5 / STEP.MS, 6);
      engine.update(5, IDLE_INPUT);
      expect(engine.state.sectorTimeMs).toBeCloseTo(STEP.MS, 6);
    });

    it('cuts a long frame to at most 8 steps', () => {
      const engine = launched();
      engine.update(1000, IDLE_INPUT);
      expect(engine.state.sectorTimeMs).toBeCloseTo(8 * STEP.MS, 6);
      expect(engine.state.alpha).toBeLessThan(1);
    });

    it('keeps alpha in [0, 1) for any frame time', () => {
      const engine = new BreakerEngine({ seed: 3 });
      engine.update(STEP.MS, LAUNCH);
      for (const ms of [0, 1, 7.9, 8.4, 16.67, 33.3, 6.94, 250, 0.5]) {
        engine.update(ms, IDLE_INPUT);
        expect(engine.state.alpha).withContext(`${ms}`).toBeGreaterThanOrEqual(0);
        expect(engine.state.alpha).withContext(`${ms}`).toBeLessThan(1);
      }
    });

    it('keeps a launch pressed on a frame too short for a step for the next step', () => {
      const engine = new BreakerEngine({ seed: 1 });
      engine.update(2, LAUNCH);
      expect(engine.state.phase).toBe('serve');
      engine.update(10, IDLE_INPUT);
      expect(engine.state.phase).toBe('playing');
    });

    it('reuses the same events array between calls', () => {
      const engine = new BreakerEngine({ seed: 1 });
      const first = engine.update(16, IDLE_INPUT);
      const second = engine.update(16, IDLE_INPUT);
      expect(second).toBe(first);
    });
  });

  describe('the paddle', () => {
    it('stays inside the walls', () => {
      const engine = new BreakerEngine({ seed: 1 });
      run(engine, 3000, input({ moveAxis: -1 }));
      expect(engine.state.paddle.x - engine.state.paddle.w / 2).toBeCloseTo(WORLD.LEFT_WALL_X, 6);
      run(engine, 3000, input({ pointerX: 5000 }));
      expect(engine.state.paddle.x + engine.state.paddle.w / 2).toBeCloseTo(WORLD.RIGHT_WALL_X, 6);
    });

    it('reaches the keyboard top speed quickly, never more', () => {
      const engine = new BreakerEngine({ seed: 1 });
      engine.update(16.67, input({ moveAxis: 1 }));
      const early = engine.state.paddle.vx;
      run(engine, 150, input({ moveAxis: 1 }));
      expect(early).toBeGreaterThan(0);
      expect(engine.state.paddle.vx).toBeGreaterThan(PADDLE.KEY_SPEED * 0.9);
      expect(engine.state.paddle.vx).toBeLessThanOrEqual(PADDLE.KEY_SPEED + 1e-6);
    });

    it('follows the pointer fast but no faster than 2600 px/s', () => {
      const engine = new BreakerEngine({ seed: 1 });
      engine.update(STEP.MS, input({ pointerX: 900 }));
      expect(engine.state.paddle.vx).toBeLessThanOrEqual(PADDLE.POINTER_MAX_SPEED + 1e-6);
      run(engine, 400, input({ pointerX: 700 }));
      expect(engine.state.paddle.x).toBeCloseTo(700, 0);
    });
  });

  describe('bounces', () => {
    it('bounces off the left and right walls', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      const b = aim(engine, 25, 400, -1, -0.5);
      const events = run(engine, 100);
      expect(ofType(events, 'wall-hit').length).toBe(1);
      expect(b.vx).toBeGreaterThan(0);
      expect(b.x).toBeGreaterThan(BALL.R);

      aim(engine, 935, 400, 1, -0.5);
      run(engine, 100);
      expect(ball(engine).vx).toBeLessThan(0);
      expect(ball(engine).x).toBeLessThan(WORLD.RIGHT_WALL_X - BALL.R);
    });

    it('bounces off the ceiling', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      const b = aim(engine, 480, 100, 0.3, -1);
      const events = run(engine, 200);
      const hit = ofType(events, 'wall-hit')[0];
      expect(hit).toBeDefined();
      expect(hit.y).toBeCloseTo(WORLD.CEILING_Y, 0);
      expect(b.vy).toBeGreaterThan(0);
      expect(b.y).toBeGreaterThanOrEqual(WORLD.CEILING_Y + BALL.R);
    });

    it('sends the ball back up from the paddle, steeper off the center, wider off the edge', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      const px = engine.state.paddle.x;
      const halfW = engine.state.paddle.w / 2;

      aim(engine, px + halfW * 0.9, 600, 0, 1);
      const events = run(engine, 200);
      const hit = ofType(events, 'paddle-hit')[0];
      expect(hit.offset).toBeGreaterThan(0.8);
      expect(hit.perfect).toBeFalse();
      const b = ball(engine);
      expect(b.vy).toBeLessThan(0);
      const angle = Math.atan2(b.vx, -b.vy) * (180 / Math.PI);
      expect(angle).toBeGreaterThan(45);
      expect(angle).toBeLessThanOrEqual(PADDLE.MAX_BOUNCE_DEG + 1e-6);
    });

    it('pays a perfect hit on the center of the paddle', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      aim(engine, engine.state.paddle.x, 600, 0, 1);
      const events = run(engine, 200);
      const hit = ofType(events, 'paddle-hit')[0];
      expect(hit.perfect).toBeTrue();
      expect(engine.state.score).toBe(PADDLE.PERFECT_POINTS);
      expect(engine.state.overdrive).toBeCloseTo(OVERDRIVE.PER_PERFECT, 10);
      expect(engine.summary().perfectHits).toBe(1);
    });

    it('pays a perfect hit once, then not again until the ball touches a brick', () => {
      // A vertical ball in an empty column comes back to the center forever: it must not farm points.
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      aim(engine, engine.state.paddle.x, 600, 0, 1);
      const events = run(engine, 8000);
      const hits = ofType(events, 'paddle-hit');
      expect(hits.length).toBeGreaterThan(1);
      expect(hits.filter((h) => h.perfect).length).toBe(1);
      expect(engine.state.score).toBe(PADDLE.PERFECT_POINTS);
      expect(engine.state.overdrive).toBeCloseTo(OVERDRIVE.PER_PERFECT, 10);
      expect(engine.summary().perfectHits).toBe(1);
    });

    it('never lets the ball run flat: |vy| stays >= 0.34 of the speed after a bounce', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      aim(engine, 30, 400, -1, -0.01);
      run(engine, 100);
      const b = ball(engine);
      expect(Math.abs(b.vy) / Math.hypot(b.vx, b.vy)).toBeGreaterThanOrEqual(BALL.MIN_VY_SHARE - 1e-9);
    });

    it('speeds the ball up a little with each paddle hit, up to +15%', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      const base = sectorParams(1).ballSpeed;
      for (let i = 0; i < 60; i++) {
        aim(engine, engine.state.paddle.x + 30, 645, 0, 1);
        run(engine, 50);
      }
      const b = ball(engine);
      expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(base * (1 + BALL.MAX_SPEEDUP), 3);
    });
  });

  describe('no tunneling', () => {
    it('a 2000 px/s ball never goes through a brick or the paddle over 10 s', () => {
      const layout = ['.............', '.............', '.............', '#############'];
      const engine = BreakerEngine.forTest({ seed: 5, layout, params: { ballSpeed: 2000 } });
      engine.applyPowerUp('wide');
      aim(engine, engine.state.paddle.x, 500, 0.4, -1);
      const steelBottom = rowBottom(3);
      const lost: BreakerEvent[] = [];
      let lowest = 0;
      let highest: number = WORLD.HEIGHT;
      for (let t = 0; t < 10000; t += 1000 / 60) {
        const b = ball(engine);
        const events = engine.update(1000 / 60, input({ pointerX: b.x + 25 * Math.sin(t / 300) }));
        lost.push(...events.filter((e) => e.type === 'ball-lost' || e.type === 'life-lost'));
        const now = ball(engine);
        lowest = Math.max(lowest, now.y);
        highest = Math.min(highest, now.y);
        expect(Math.hypot(now.vx, now.vy)).toBeGreaterThanOrEqual(2000 - 1e-6);
      }
      expect(lost).toEqual([]);
      expect(highest).toBeGreaterThanOrEqual(steelBottom + BALL.R - 0.01);
      expect(lowest).toBeLessThanOrEqual(PADDLE.Y - BALL.R + 0.01);
    });

    it('a fast ball hits the first of two stacked bricks, not the one behind it', () => {
      const layout = ['.............', '......1......', '......1......'];
      const engine = BreakerEngine.forTest({ seed: 5, layout, params: { ballSpeed: 2000 } });
      aim(engine, colX(6), 300, 0, -1);
      const events = run(engine, 100);
      const destroyed = ofType(events, 'brick-destroyed');
      expect(destroyed.length).toBe(1);
      expect(brickAt(engine, 6, 2)).toBeUndefined();
      expect(brickAt(engine, 6, 1)).toBeDefined();
    });
  });

  describe('bricks', () => {
    it('takes one hp per hit, flashing, and breaks at 0 with points, combo and overdrive', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......2......', '1............'] });
      aim(engine, colX(6), 220, 0, -1);
      let events = run(engine, 400);
      const hit = ofType(events, 'brick-hit')[0];
      expect(hit.hpLeft).toBe(1);
      expect(hit.kind).toBe('tough');
      expect(brickAt(engine, 6, 0)!.hp).toBe(1);
      expect(ball(engine).vy).toBeGreaterThan(0);

      aim(engine, colX(6), 220, 0, -1);
      events = run(engine, 400);
      const destroyed = ofType(events, 'brick-destroyed')[0];
      expect(destroyed.kind).toBe('tough');
      expect(destroyed.points).toBe(Math.round(80 * 1.1));
      expect(destroyed.combo).toBe(1);
      expect(engine.state.combo).toBe(1);
      expect(engine.state.score).toBe(88);
      expect(engine.state.overdrive).toBeCloseTo(OVERDRIVE.PER_BRICK, 10);
      expect(brickAt(engine, 6, 0)).toBeUndefined();
    });

    it('steel never breaks', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......#......', '1............'] });
      for (let i = 0; i < 5; i++) {
        aim(engine, colX(6), 220, 0, -1);
        const events = run(engine, 400);
        expect(ofType(events, 'steel-hit').length).toBeGreaterThan(0);
      }
      expect(brickAt(engine, 6, 0)!.alive).toBeTrue();
      expect(engine.state.score).toBe(0);
    });

    it('an explosive takes its 8 neighbors except steel, in a chain', () => {
      const layout = ['..1#1........', '..**1........', '.............', '.........1...'];
      const engine = BreakerEngine.forTest({ seed: 1, layout });
      aim(engine, colX(2), 250, 0, -1);
      const events = run(engine, 400);
      expect(ofType(events, 'explosion').length).toBe(2);
      // The fuse hit, the one beside it (by chain) and the 3 normal bricks they reach.
      expect(ofType(events, 'brick-destroyed').length).toBe(5);
      expect(brickAt(engine, 3, 0)!.alive).toBeTrue();
      expect(brickAt(engine, 9, 3)).toBeDefined();
      expect(engine.state.combo).toBe(5);
    });

    it('a prism breaks and splits the ball that hit it', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......%......', '1............'] });
      aim(engine, colX(6) - 10, 220, -0.3, -1);
      const events = run(engine, 400);
      expect(ofType(events, 'ball-split')[0]).toEqual(jasmine.objectContaining({ type: 'ball-split', count: 2 }));
      expect(engine.state.balls.length).toBe(2);
      const [a, b] = engine.state.balls;
      expect(Math.sign(a.vx)).toBe(-Math.sign(b.vx));
    });

    it('drops capsules on the first 3 bricks of sector 1', () => {
      const engine = new BreakerEngine({ seed: 1 });
      const lowest = [...engine.state.bricks].sort((p, q) => q.y - p.y)[0];
      aim(engine, lowest.x + lowest.w / 2, lowest.y + 90, 0, -1);
      const events = run(engine, 600, () => input({ pointerX: 100 }));
      const destroyed = ofType(events, 'brick-destroyed').length;
      expect(destroyed).toBeGreaterThan(0);
      expect(ofType(events, 'capsule-spawned').length).toBe(Math.min(3, destroyed));
    });
  });

  describe('capsules', () => {
    it('fall at 150 px/s and are caught by the paddle', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......?......', '1............'] });
      aim(engine, colX(6), 220, 0, -1);
      const events: BreakerEvent[] = run(engine, 400, input({ pointerX: 100 }));
      const spawned = ofType(events, 'capsule-spawned')[0];
      expect(spawned).toBeDefined();
      const capsule = engine.state.capsules[0];
      const y0 = capsule.y;
      run(engine, 1000, input({ pointerX: 100 }));
      expect(engine.state.capsules[0].y - y0).toBeCloseTo(150, -1);

      const more = run(engine, 5000, input({ pointerX: colX(6) }));
      expect(ofType(more, 'capsule-caught')[0]).toEqual(jasmine.objectContaining({ kind: spawned.kind }));
      expect(engine.state.capsules.length).toBe(0);
      expect(engine.summary().powerUpsCaught).toBe(1);
    });

    it('vanish when they fall past the bottom', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......?......', '1............'] });
      aim(engine, colX(6), 220, 0, -1);
      run(engine, 400, input({ pointerX: 60 }));
      expect(engine.state.capsules.length).toBe(1);
      const events = run(engine, 5000, input({ pointerX: 60 }));
      expect(ofType(events, 'capsule-caught').length).toBe(0);
      expect(engine.state.capsules.length).toBe(0);
    });
  });

  describe('power-ups', () => {
    it('multi turns each ball into 3, up to 12', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      aim(engine, 480, 400, 0.2, -1);
      engine.applyPowerUp('multi');
      expect(engine.state.balls.length).toBe(3);
      const speeds = engine.state.balls.map((b) => Math.hypot(b.vx, b.vy));
      for (const s of speeds) expect(s).toBeCloseTo(speeds[0], 6);
      engine.applyPowerUp('multi');
      expect(engine.state.balls.length).toBe(9);
      engine.applyPowerUp('multi');
      expect(engine.state.balls.length).toBe(BALL.CAP);
      expect(new Set(engine.state.balls.map((b) => b.id)).size).toBe(BALL.CAP);
    });

    it('wide eases the paddle to x1.5 and stacks to x2; shrink cancels it', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      const base = engine.state.paddle.w;
      engine.applyPowerUp('wide');
      expect(engine.state.paddle.targetW).toBeCloseTo(base * 1.5, 6);
      engine.update(STEP.MS, IDLE_INPUT);
      expect(engine.state.paddle.w).toBeGreaterThan(base);
      expect(engine.state.paddle.w).toBeLessThan(base * 1.5);
      run(engine, 1000);
      expect(engine.state.paddle.w).toBeCloseTo(base * 1.5, 0);
      engine.applyPowerUp('wide');
      expect(engine.state.paddle.targetW).toBeCloseTo(base * 2, 6);
      engine.applyPowerUp('shrink');
      expect(engine.state.paddle.targetW).toBeCloseTo(base * 0.65, 6);
    });

    it('slow and fast change the ball speed and cancel each other', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      const base = sectorParams(1).ballSpeed;
      aim(engine, 480, 400, 0.2, -1);
      engine.applyPowerUp('slow');
      run(engine, 20);
      expect(Math.hypot(ball(engine).vx, ball(engine).vy)).toBeCloseTo(base * EFFECTS.SLOW_FACTOR, 3);
      engine.applyPowerUp('fast');
      run(engine, 20);
      expect(Math.hypot(ball(engine).vx, ball(engine).vy)).toBeCloseTo(base * EFFECTS.FAST_FACTOR, 3);
      expect(engine.state.effects.map((e) => e.kind)).toEqual(['fast']);
    });

    it('scales durations by the sector and refreshes them when caught again', () => {
      // A crawling ball cannot reach the brick and end the sector in 16 s.
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER, params: { ballSpeed: 60 } });
      aim(engine, 480, 400, 0.2, -1);
      engine.applyPowerUp('laser');
      const scale = sectorParams(1).durationScale;
      expect(engine.state.effects[0].durationMs).toBeCloseTo(EFFECT_MS.laser * scale, 6);
      run(engine, 3000);
      engine.applyPowerUp('laser');
      expect(engine.state.effects[0].remainingMs).toBeCloseTo(EFFECT_MS.laser * scale, 6);
      const events = run(engine, EFFECT_MS.laser * scale + 100, () => input({ pointerX: ball(engine).x }));
      expect(events).toContain({ type: 'effect-ended', kind: 'laser' });
    });

    it('laser fires two bolts every 220 ms while fire is held, and a bolt breaks a brick', () => {
      // A crawling ball stays out of the way while the bolts work.
      const layout = ['.............', '.............', '1111111111111'];
      const engine = BreakerEngine.forTest({ seed: 1, layout, params: { ballSpeed: 60 } });
      aim(engine, 100, 500, 0, -1);
      engine.applyPowerUp('laser');
      const events = run(engine, 1000, input({ fireHeld: true, pointerX: 480 }));
      const fired = ofType(events, 'laser-fired').length;
      expect(fired).toBeGreaterThanOrEqual(2 * Math.floor(1000 / LASER.FIRE_INTERVAL_MS));
      expect(fired).toBeLessThanOrEqual(2 * Math.ceil(1000 / LASER.FIRE_INTERVAL_MS) + 2);
      expect(fired % 2).toBe(0);
      expect(ofType(events, 'brick-destroyed').length).toBeGreaterThan(0);
    });

    it('magnet holds the ball on the paddle, then lets it go on launch or after 2.5 s', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      engine.applyPowerUp('magnet');
      aim(engine, engine.state.paddle.x + 20, 600, 0, 1);
      run(engine, 200);
      expect(ball(engine).stuck).toBeTrue();
      expect(engine.state.phase).toBe('playing');
      const events = run(engine, EFFECTS.MAGNET_HOLD_MS + 100);
      expect(ofType(events, 'ball-launched').length).toBe(1);
      expect(ball(engine).stuck).toBeFalse();

      aim(engine, engine.state.paddle.x - 20, 600, 0, 1);
      run(engine, 200);
      expect(ball(engine).stuck).toBeTrue();
      engine.update(STEP.MS, LAUNCH);
      expect(ball(engine).stuck).toBeFalse();
      expect(ball(engine).vy).toBeLessThan(0);
    });

    it('fire goes through bricks without bouncing, but bounces on steel', () => {
      const layout = ['......#......', '......1......', '......2......', '......3......', '1............'];
      const engine = BreakerEngine.forTest({ seed: 1, layout });
      engine.applyPowerUp('fire');
      aim(engine, colX(6), 280, 0, -1);
      const events = run(engine, 800);
      expect(ofType(events, 'brick-destroyed').length).toBe(3);
      expect(ofType(events, 'steel-hit').length).toBe(1);
      expect(ball(engine).vy).toBeGreaterThan(0);
    });

    it('barrier saves one ball once, then goes away', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      engine.applyPowerUp('barrier');
      expect(engine.state.barrier).toBeTrue();
      aim(engine, 60, 650, 0, 1);
      const events = run(engine, 300, input({ pointerX: 800 }));
      expect(ofType(events, 'barrier-used').length).toBe(1);
      expect(ofType(events, 'ball-lost').length).toBe(0);
      expect(ball(engine).vy).toBeLessThan(0);
      expect(engine.state.barrier).toBeFalse();
    });

    it('barrier: the paddle moved under the rising ball does not send it back down', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      engine.applyPowerUp('barrier');
      aim(engine, 100, 650, 0, 1);
      const events: BreakerEvent[] = [];
      let saved = false;
      for (let f = 0; f < 90; f++) {
        // The paddle waits far away; the moment the barrier saves the ball it slides right above it.
        const p = engine.state.paddle as { x: number };
        if (saved) p.x = ball(engine).x;
        const step = engine.update(1000 / 60, input({ pointerX: saved ? ball(engine).x : 900 }));
        events.push(...step);
        if (ofType(step, 'barrier-used').length > 0) saved = true;
      }
      expect(ofType(events, 'barrier-used').length).toBe(1);
      expect(ofType(events, 'ball-lost').length).toBe(0);
      expect(ofType(events, 'life-lost').length).toBe(0);
      expect(ball(engine).vy).toBeLessThan(0);
    });

    it('life adds one, up to 5', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      engine.applyPowerUp('life');
      expect(engine.state.lives).toBe(4);
      engine.applyPowerUp('life');
      engine.applyPowerUp('life');
      expect(engine.state.lives).toBe(5);
      expect(engine.update(1, IDLE_INPUT).filter((e) => e.type === 'life-gained').length).toBe(2);
    });

    it('life with 5 lives already pays points instead', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      engine.applyPowerUp('life');
      engine.applyPowerUp('life');
      expect(engine.state.score).toBe(0);
      engine.applyPowerUp('life');
      expect(engine.state.lives).toBe(5);
      expect(engine.state.score).toBe(SCORE.LIFE_AT_MAX_POINTS);
    });

    it('nova fills overdrive; overdrive starts a 6 s nova that pierces and doubles the score', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......1......', '......1......', '1............'] });
      aim(engine, 480, 400, 0.2, 1);
      engine.applyPowerUp('nova');
      expect(engine.state.overdrive).toBe(1);
      let events = engine.update(STEP.MS, IDLE_INPUT);
      expect(events).toContain({ type: 'overdrive-ready' });

      events = engine.update(STEP.MS, input({ overdrivePressed: true }));
      expect(events).toContain({ type: 'nova-started' });
      expect(engine.state.novaRemainingMs).toBeCloseTo(OVERDRIVE.NOVA_MS - STEP.MS, 6);
      expect(engine.state.overdrive).toBe(0);
      expect(engine.state.multiplier).toBe(2);

      aim(engine, colX(6), 250, 0, -1);
      events = run(engine, 500);
      expect(ofType(events, 'brick-destroyed').map((e) => e.points)).toEqual([Math.round(50 * 1.1 * 2), Math.round(50 * 1.2 * 2)]);

      events = run(engine, OVERDRIVE.NOVA_MS, () => input({ pointerX: ball(engine).x }));
      expect(events).toContain({ type: 'nova-ended' });
      expect(engine.state.novaRemainingMs).toBe(0);
    });

    it('ignores overdrive until the meter is full', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      aim(engine, 480, 400, 0.2, -1);
      const events = engine.update(STEP.MS, input({ overdrivePressed: true }));
      expect(events.some((e) => e.type === 'nova-started')).toBeFalse();
    });
  });

  describe('combo', () => {
    it('is lost after 3 s without a brick', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......1......', '1............'] });
      aim(engine, colX(6), 220, 0, -1);
      run(engine, 300);
      expect(engine.state.combo).toBe(1);
      expect(engine.state.multiplier).toBeCloseTo(1.1, 10);
      const events = run(engine, 3100, () => input({ pointerX: ball(engine).x }));
      expect(events).toContain({ type: 'combo-lost', combo: 1 });
      expect(engine.state.combo).toBe(0);
    });
  });

  describe('lives', () => {
    it('losing the last ball costs a life and serves a new one', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      engine.applyPowerUp('laser');
      aim(engine, 60, 690, 0, 1);
      const events = run(engine, 300, input({ pointerX: 800 }));
      expect(ofType(events, 'ball-lost').length).toBe(1);
      expect(events).toContain({ type: 'life-lost', livesLeft: 2 });
      expect(engine.state.lives).toBe(2);
      expect(engine.state.phase).toBe('serve');
      expect(engine.state.balls.length).toBe(1);
      expect(engine.state.balls[0].stuck).toBeTrue();
      expect(engine.state.effects.length).toBe(0);
    });

    it('losing one of two balls costs nothing', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      aim(engine, 480, 300, 0.2, -1);
      engine.applyPowerUp('multi');
      const first = ball(engine);
      first.x = first.prevX = 60;
      first.y = first.prevY = 715;
      first.vy = Math.abs(first.vy);
      first.vx = 0;
      const events = engine.update(50, input({ pointerX: 800 }));
      expect(ofType(events, 'ball-lost').length).toBe(1);
      expect(ofType(events, 'life-lost').length).toBe(0);
      expect(engine.state.balls.length).toBe(2);
    });

    it('ends the game after 3 lives', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      const all: BreakerEvent[] = [];
      for (let i = 0; i < 3; i++) {
        aim(engine, 60, 690, 0, 1);
        all.push(...run(engine, 300, input({ pointerX: 800 })));
      }
      expect(ofType(all, 'life-lost').map((e) => e.livesLeft)).toEqual([2, 1, 0]);
      const over = ofType(all, 'game-over');
      expect(over.length).toBe(1);
      expect(over[0].summary.sector).toBe(1);
      expect(engine.state.phase).toBe('over');
      expect(engine.state.lives).toBe(0);

      const time = engine.state.runTimeMs;
      expect(run(engine, 500, LAUNCH)).toEqual([]);
      expect(engine.state.runTimeMs).toBe(time);
    });
  });

  describe('clearing a sector', () => {
    it('goes clearing in slow motion, then cleared with the bonus', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......1......'] });
      aim(engine, colX(6), 220, 0, -1);
      let events = run(engine, 300);
      const last = ofType(events, 'last-brick')[0];
      expect(last.x).toBeCloseTo(colX(6), 6);
      expect(engine.state.phase).toBe('clearing');
      expect(engine.state.timeScale).toBe(CLEARING.TIME_SCALE);
      const scoreBefore = engine.state.score;
      const timeBefore = engine.state.sectorTimeMs;

      events = run(engine, CLEARING.MS + 50);
      const cleared = ofType(events, 'sector-cleared')[0];
      expect(cleared).toBeDefined();
      expect(cleared.sector).toBe(1);
      expect(cleared.noMiss).toBeTrue();
      expect(cleared.timeMs).toBeCloseTo(timeBefore, 6);
      expect(cleared.bonus).toBe(1000 + 50 * Math.floor((cleared.parTimeMs - cleared.timeMs) / 1000) + 2000);
      expect(engine.state.score).toBe(scoreBefore + cleared.bonus);
      expect(engine.state.phase).toBe('cleared');
      expect(engine.state.sectorTimeMs).toBeCloseTo(timeBefore, 6);
      expect(engine.summary().sectorsCleared).toBe(1);
      expect(engine.summary().sectorTimes[1]).toBeCloseTo(timeBefore, 6);
    });

    it('lets the balls move slowly during the outro, and removes the capsules', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......?......'] });
      aim(engine, colX(6), 220, 0, -1);
      run(engine, 300);
      expect(engine.state.phase).toBe('clearing');
      expect(engine.state.capsules.length).toBe(0);
      const b = ball(engine);
      const y0 = b.y;
      engine.update(STEP.MS, IDLE_INPUT);
      const moved = Math.abs(b.y - y0);
      expect(moved).toBeCloseTo((Math.abs(b.vy) * STEP.MS * CLEARING.TIME_SCALE) / 1000, 3);
    });

    it('nextSector builds the next sector and serves, keeping lives and score', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......1......'] });
      engine.applyPowerUp('wide');
      aim(engine, colX(6), 220, 0, -1);
      run(engine, 300 + CLEARING.MS + 100);
      expect(engine.state.phase).toBe('cleared');
      const score = engine.state.score;

      engine.nextSector();
      const s = engine.state;
      expect(s.phase).toBe('serve');
      expect(s.sector).toBe(2);
      expect(s.score).toBe(score);
      expect(s.lives).toBe(3);
      expect(s.effects.length).toBe(0);
      expect(s.balls.length).toBe(1);
      expect(s.balls[0].stuck).toBeTrue();
      expect(s.sectorTimeMs).toBe(0);
      expect(s.theme).toBe(1);
      expect(s.paddle.targetW).toBe(sectorParams(2).paddleWidth);
      expect(engine.update(1, IDLE_INPUT)).toContain({ type: 'sector-started', sector: 2 });
    });

    it('nextSector does nothing outside cleared', () => {
      const engine = new BreakerEngine({ seed: 1 });
      engine.nextSector();
      expect(engine.state.sector).toBe(1);
    });

    it('a lost life in the sector loses the no-miss bonus', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......1......'] });
      aim(engine, 60, 690, 0, 1);
      run(engine, 300, input({ pointerX: 800 }));
      aim(engine, colX(6), 220, 0, -1);
      const events = run(engine, 300 + CLEARING.MS + 100);
      expect(ofType(events, 'sector-cleared')[0].noMiss).toBeFalse();
    });
  });

  describe('time', () => {
    it('counts play only, not the serve, the outro nor the cleared card', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......1......'] });
      run(engine, 500);
      expect(engine.state.runTimeMs).toBe(0);
      engine.update(STEP.MS, LAUNCH);
      run(engine, 500);
      expect(engine.state.runTimeMs).toBeGreaterThan(450);
      aim(engine, colX(6), 220, 0, -1);
      run(engine, 300);
      expect(engine.state.phase).toBe('clearing');
      const t = engine.state.runTimeMs;
      run(engine, CLEARING.MS + 500);
      expect(engine.state.phase).toBe('cleared');
      expect(engine.state.runTimeMs).toBe(t);
    });
  });

  describe('moving rows and the ceiling', () => {
    it('swings marked rows sideways, never out of the walls', () => {
      const layout = ['1111111111111~', '.............', '....111......~', '1............'];
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 6, layout, params: { rowMotionAmplitude: 200, rowMotionSpeed: 3 } });
      const fixed = brickAt(engine, 0, 3)!;
      const fixedX = fixed.x;
      let minX = Infinity;
      let maxX = -Infinity;
      let swing = 0;
      const start = brickAt(engine, 4, 2)!.x;
      for (let i = 0; i < 300; i++) {
        engine.update(1000 / 60, IDLE_INPUT);
        for (const b of engine.state.bricks) {
          if (!b.alive) continue;
          minX = Math.min(minX, b.x);
          maxX = Math.max(maxX, b.x + b.w);
        }
        swing = Math.max(swing, Math.abs(brickAt(engine, 4, 2)!.x - start));
      }
      expect(minX).toBeGreaterThanOrEqual(WORLD.LEFT_WALL_X);
      expect(maxX).toBeLessThanOrEqual(WORLD.RIGHT_WALL_X);
      expect(swing).toBeGreaterThan(100);
      expect(brickAt(engine, 0, 3)!.x).toBe(fixedX);
    });

    it('does not move rows before sector 6', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 2, layout: ['....111......~'] });
      const x = brickAt(engine, 4, 0)!.x;
      run(engine, 1000);
      expect(brickAt(engine, 4, 0)!.x).toBe(x);
    });

    it('brings the formation down; a brick reaching y = 600 costs a life and pushes it back 90 px', () => {
      const layout = [...Array(13).fill('.............'), '1............'];
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 8, layout, params: { ceilingDescent: 100 } });
      aim(engine, 900, 400, 0.1, -1);
      const brick = brickAt(engine, 0, 13)!;
      const y0 = brick.y;
      run(engine, 500, () => input({ pointerX: ball(engine).x }));
      expect(brick.y).toBeGreaterThan(y0 + 40);

      const events = run(engine, 500, () => input({ pointerX: ball(engine).x }));
      expect(events).toContain({ type: 'life-lost', livesLeft: 2 });
      expect(engine.state.lives).toBe(2);
      // Pushed back from about y + 80 to the start, then down again for ~0.2 s.
      expect(brick.y + brick.h).toBeLessThan(560);
      expect(engine.state.phase).toBe('playing');
    });

    it('steel never sinks below the danger line and never costs a life', () => {
      const layout = [...Array(10).fill('.............'), '#############'];
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 8, layout, params: { ceilingDescent: 100 } });
      aim(engine, 900, 300, 0.1, -1);
      let lives = engine.state.lives;
      let worst = 0;
      for (let f = 0; f < 60 * 12; f++) {
        engine.update(1000 / 60, input({ pointerX: ball(engine).x }));
        for (const brick of engine.state.bricks) if (brick.alive) worst = Math.max(worst, brick.y + brick.h);
        lives = Math.min(lives, engine.state.lives);
      }
      expect(worst).toBeLessThanOrEqual(CEILING.DANGER_Y + 0.001);
      expect(lives).toBe(3);
    });

    it('keeps the ceiling still before sector 8', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 7, layout: CORNER });
      aim(engine, 480, 400, 0.2, -1);
      const y = engine.state.bricks[0].y;
      run(engine, 2000, () => input({ pointerX: ball(engine).x }));
      expect(engine.state.bricks[0].y).toBe(y);
    });
  });

  describe('extra lives', () => {
    it('gives a life every 40000 points', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['......1......', '1............'], score: 39990 });
      aim(engine, colX(6), 220, 0, -1);
      const events = run(engine, 300);
      expect(events).toContain({ type: 'life-gained', lives: 4 });
    });
  });

  describe('determinism', () => {
    /**
     * Plays two engines in lockstep with the same inputs. The pointer chases
     * engine a's first ball, so the run is a real rally (bricks, paddle hits,
     * capsules); if b ever drifted from a, the final states would differ.
     */
    function playBoth(a: BreakerEngine, b: BreakerEngine, ms: number): [BreakerEvent[], BreakerEvent[]] {
      const eventsA: BreakerEvent[] = [];
      const eventsB: BreakerEvent[] = [];
      const frame = 1000 / 60;
      for (let t = 0, f = 0; t < ms; t += frame, f++) {
        const chase = a.state.balls[0];
        const step: BreakerInput = {
          moveAxis: f % 400 > 380 ? 1 : 0,
          pointerX: chase ? chase.x + 20 * Math.sin(f / 37) : null,
          launchPressed: f % 120 === 1,
          fireHeld: f % 50 < 25,
          overdrivePressed: f % 300 === 7,
        };
        eventsA.push(...a.update(frame, step));
        eventsB.push(...b.update(frame, step));
      }
      return [eventsA, eventsB];
    }

    it('replays the same run from the same seed and the same inputs', () => {
      const a = new BreakerEngine({ seed: 77, startSector: 3 });
      const b = new BreakerEngine({ seed: 77, startSector: 3 });
      const [eventsA, eventsB] = playBoth(a, b, 30000);
      expect(JSON.stringify(eventsA)).toBe(JSON.stringify(eventsB));
      expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
      // The run plays for real: bricks break, the paddle is hit, capsules fall.
      expect(a.summary().bricksBroken).toBeGreaterThan(5);
      expect(eventsA.some((e) => e.type === 'paddle-hit')).toBeTrue();
      expect(eventsA.some((e) => e.type === 'capsule-spawned')).toBeTrue();
    });

    it('plays a different run from another seed in a procedural sector', () => {
      const a = new BreakerEngine({ seed: 1, startSector: 12 });
      const b = new BreakerEngine({ seed: 2, startSector: 12 });
      const shape = (e: BreakerEngine) => e.state.bricks.map((k) => `${k.col},${k.row},${k.kind}`).join(';');
      expect(shape(a)).not.toBe(shape(b));
    });
  });

  describe('practice runs', () => {
    it('marks a run started past sector 1 as practice, and a normal run not', () => {
      expect(new BreakerEngine({ seed: 1, startSector: 5 }).summary().practice).toBeTrue();
      expect(new BreakerEngine({ seed: 1 }).summary().practice).toBeUndefined();
      expect(new BreakerEngine({ seed: 1, startSector: 1 }).summary().practice).toBeUndefined();
    });

    it('stays practice after clearing sectors', () => {
      const engine = BreakerEngine.forTest({ seed: 1, startSector: 3, layout: CORNER });
      (engine as unknown as { phase: string }).phase = 'cleared';
      engine.nextSector();
      expect(engine.state.sector).toBe(4);
      expect(engine.summary().practice).toBeTrue();
    });
  });

  describe('steel corners and walls', () => {
    /** Runs frame by frame and returns the longest time (ms) any free ball spent without moving. */
    function longestStill(engine: BreakerEngine, ms: number, each: (t: number) => BreakerInput): number {
      const frame = 1000 / 60;
      const last = new Map<number, { x: number; y: number; still: number }>();
      let longest = 0;
      for (let t = 0; t < ms; t += frame) {
        const s = engine.state;
        if (s.phase === 'over') break;
        if (s.phase === 'cleared') {
          engine.nextSector();
          last.clear();
          continue;
        }
        engine.update(frame, each(t));
        for (const b of engine.state.balls) {
          const seen = last.get(b.id);
          const still = !b.stuck && seen !== undefined && Math.hypot(b.x - seen.x, b.y - seen.y) < 0.01 ? seen.still + frame : 0;
          last.set(b.id, { x: b.x, y: b.y, still });
          longest = Math.max(longest, still);
        }
      }
      return longest;
    }

    it('a ball grazing a steel corner at a shallow angle leaves it (no freeze)', () => {
      const layout = ['.............', '.............', '.............', '............1', '....#........'];
      const engine = BreakerEngine.forTest({ seed: 1, layout, params: { ceilingDescent: 0, rowMotionAmplitude: 0 } });
      const steel = brickAt(engine, 4, 4)!;
      expect(steel.kind).toBe('steel');
      // Touching the top-left corner, normal about (-0.29, -0.96), heading left and a little down.
      const b = aim(engine, steel.x - 0.289 * BALL.R, steel.y - 0.957 * BALL.R, -Math.sqrt(1 - 0.34 * 0.34), 0.34);
      const startX = b.x;
      const startY = b.y;
      run(engine, 100, input({ pointerX: 480 }));
      const after = ball(engine);
      expect(Math.hypot(after.x - startX, after.y - startY)).toBeGreaterThan(10);
      // It left upwards, away from the corner.
      expect(after.vy).toBeLessThan(0);
    });

    it('never freezes a ball sent grazing into any steel corner (seeded fuzz)', () => {
      const layout = ['.............', '..#...#...#..', '.............', '....#...#...1', '.............', '..#...#...#..'];
      const frozen: string[] = [];
      for (let seed = 1; seed <= 160; seed++) {
        const rng = new Rng(seed);
        const engine = BreakerEngine.forTest({ seed, layout, params: { ceilingDescent: 0, rowMotionAmplitude: 0 } });
        engine.update(STEP.MS, LAUNCH);
        const steels = engine.state.bricks.filter((k) => k.kind === 'steel');
        const k = steels[rng.int(0, steels.length - 1)];
        const corner = rng.int(0, 3);
        const cx = corner % 2 === 0 ? k.x : k.x + k.w;
        const cy = corner < 2 ? k.y : k.y + k.h;
        // Normal inside the corner's outward quadrant, then a velocity almost along the surface, slightly into it.
        const theta = rng.range(0.05, Math.PI / 2 - 0.05);
        const nx = (corner % 2 === 0 ? -1 : 1) * Math.cos(theta);
        const ny = (corner < 2 ? -1 : 1) * Math.sin(theta);
        const side = rng.next() < 0.5 ? 1 : -1;
        const into = rng.range(0.005, 0.2);
        const vx = side * -ny * Math.cos(into) - nx * Math.sin(into);
        const vy = side * nx * Math.cos(into) - ny * Math.sin(into);
        aim(engine, cx + nx * BALL.R, cy + ny * BALL.R, vx, vy);
        const longest = longestStill(engine, 1500, () => input({ pointerX: ball(engine)?.x ?? 480 }));
        if (longest > 1000) frozen.push(`seed ${seed}: corner ${corner} of (${k.x},${k.y}) n=(${nx.toFixed(2)},${ny.toFixed(2)})`);
      }
      expect(frozen).toEqual([]);
    });

    it('never freezes a ball nor lets one out of the walls across seeded sectors with steel', () => {
      const problems: string[] = [];
      for (const seed of [11, 4242, 90001]) {
        for (const startSector of [5, 7, 9, 10, 13]) {
          const engine = new BreakerEngine({ seed, startSector });
          const rng = new Rng(seed * 31 + startSector);
          let frames = 0;
          const longest = longestStill(engine, 90_000, () => {
            frames++;
            const s = engine.state;
            if (frames % 600 === 1 && s.phase === 'playing' && s.balls.length < 6) engine.applyPowerUp('multi');
            let target: number | null = null;
            let lowY = -1;
            for (const b of s.balls) if (!b.stuck && b.vy > 0 && b.y > lowY) [lowY, target] = [b.y, b.x];
            if (target === null) target = s.balls[0]?.x ?? 480;
            for (const b of s.balls) {
              if (b.x < WORLD.LEFT_WALL_X + b.r - 0.01 || b.x > WORLD.RIGHT_WALL_X - b.r + 0.01 || b.y < WORLD.CEILING_Y + b.r - 0.01) {
                problems.push(`seed ${seed} sector ${s.sector}: ball out at (${b.x.toFixed(2)}, ${b.y.toFixed(2)})`);
              }
            }
            return input({ pointerX: target + (rng.next() - 0.5) * s.paddle.w * 0.5, launchPressed: rng.next() < 0.05, fireHeld: true });
          });
          if (longest > 1000) problems.push(`seed ${seed} start ${startSector}: a ball froze ${Math.round(longest)} ms`);
        }
      }
      expect(problems).toEqual([]);
    });

    it('puts a ball that ended up past a wall back inside within one step', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      // Whatever pushed it there (an overlap push-out, a swinging row), it is past the right limit, heading down-left.
      aim(engine, WORLD.RIGHT_WALL_X - BALL.R + 3, 400, -0.1, 1);
      engine.update(STEP.MS, IDLE_INPUT);
      expect(ball(engine).x).toBeLessThanOrEqual(WORLD.RIGHT_WALL_X - BALL.R);
      aim(engine, WORLD.LEFT_WALL_X + BALL.R - 3, 400, 0.1, 1);
      engine.update(STEP.MS, IDLE_INPUT);
      expect(ball(engine).x).toBeGreaterThanOrEqual(WORLD.LEFT_WALL_X + BALL.R);
    });

    it('lets a ball squeezed between the paddle side and a wall get out (over or under it) instead of freezing', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      const hug = input({ pointerX: 0 });
      run(engine, 600, hug);
      const p = engine.state.paddle;
      expect(p.x - p.w / 2).toBeLessThanOrEqual(WORLD.LEFT_WALL_X + 0.5);
      // Below the paddle's top, against the wall, heading into the paddle's side.
      // Center 9 px from top and bottom, 8 from the left side: the shallowest way out is through the wall.
      const b = aim(engine, WORLD.LEFT_WALL_X + BALL.R, p.y + p.h / 2, 1, 0.95);
      const id = b.id;
      const startY = b.y;
      run(engine, 300, hug);
      const same = engine.state.balls.find((k) => k.id === id);
      if (same) expect(Math.abs(same.y - startY)).toBeGreaterThan(5);
    });

    it('keeps a magnet-held ball on the paddle (and inside the walls) when the paddle is narrower than its offset', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      run(engine, 600, input({ pointerX: 960 }));
      const b = ball(engine);
      expect(b.stuck).toBeTrue();
      // Caught near the edge of a wide paddle, which then shrank back.
      b.stuckOffset = 140;
      engine.update(STEP.MS, input({ pointerX: 960 }));
      const p = engine.state.paddle;
      expect(b.x).toBeLessThanOrEqual(p.x + p.w / 2 - BALL.R + 0.01);
      expect(b.x).toBeLessThanOrEqual(WORLD.RIGHT_WALL_X - BALL.R);
    });
  });

  describe('ids and the hot path', () => {
    it('gives increasing ids and keeps the arrays it exposes', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: CORNER });
      const balls = engine.state.balls;
      const bricks = engine.state.bricks;
      aim(engine, 480, 300, 0.2, -1);
      engine.applyPowerUp('multi');
      const ids = engine.state.balls.map((b) => b.id);
      expect([...ids].sort((p, q) => p - q)).toEqual(ids);
      run(engine, 2000, () => input({ pointerX: ball(engine).x }));
      expect(engine.state.balls).toBe(balls);
      expect(engine.state.bricks).toBe(bricks);
    });

    it('survives a long chaotic run with every ball inside the world', () => {
      const engine = new BreakerEngine({ seed: 11, startSector: 9 });
      engine.update(STEP.MS, LAUNCH);
      engine.applyPowerUp('multi');
      engine.applyPowerUp('multi');
      // The run may end in game over with no ball left, so the balls are
      // checked on every frame of it, not only at the end.
      let checked = 0;
      const outside: string[] = [];
      run(engine, 15000, (t) => {
        for (const b of engine.state.balls) {
          if (!b.alive) continue;
          checked++;
          const inside =
            b.x >= BALL.R - 0.01 &&
            b.x <= WORLD.RIGHT_WALL_X - BALL.R + 0.01 &&
            b.y >= WORLD.CEILING_Y + BALL.R - 0.01 &&
            Number.isFinite(b.vx) &&
            Number.isFinite(b.vy);
          if (!inside && outside.length < 3) outside.push(`t=${t} (${b.x}, ${b.y}) v=(${b.vx}, ${b.vy})`);
        }
        return input({ pointerX: 480 + 400 * Math.sin(t / 700), launchPressed: true });
      });
      expect(checked).toBeGreaterThan(1000);
      expect(outside).toEqual([]);
    });
  });
});
