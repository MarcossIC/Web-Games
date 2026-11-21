import { BreakerEngine, IDLE_INPUT } from './breaker-engine';
import { BALL, BALL_SPEED_SCALE_EXPONENT, BOSS, CAPSULE, CEILING, EFFECTS, GRID, PADDLE, TALL, WORLD, worldLayout } from './config';
import type { BreakerInput } from './types';

function input(overrides: Partial<BreakerInput> = {}): BreakerInput {
  return { ...IDLE_INPUT, ...overrides };
}

function run(engine: BreakerEngine, ms: number, each: BreakerInput = IDLE_INPUT): void {
  const frame = 1000 / 60;
  for (let t = 0; t < ms; t += frame) engine.update(frame, each);
}

describe('worldLayout', () => {
  it('desktop height gives exactly the legacy constants', () => {
    const l = worldLayout();
    expect(l).toEqual({
      height: WORLD.HEIGHT,
      lostY: WORLD.LOST_Y,
      paddleY: PADDLE.Y,
      barrierY: EFFECTS.BARRIER_Y,
      dangerY: CEILING.DANGER_Y,
      gridTop: GRID.TOP,
      brickH: GRID.BRICK_H,
      strideY: GRID.STRIDE_Y,
      bossY: BOSS.Y,
      ballR: BALL.R,
      paddleH: PADDLE.H,
      paddleWidthScale: 1,
      capsuleScale: 1,
      fallScale: 1,
      ballSpeedScale: 1,
    });
    expect(worldLayout(720)).toEqual(l);
  });

  it('a tall world leaves a thumb room under the paddle', () => {
    const l = worldLayout(1600);
    expect(l.height).toBe(1600);
    expect(l.lostY).toBe(1600);
    expect(l.paddleY).toBe(1384);
    expect(l.barrierY).toBe(1424);
    expect(l.dangerY).toBe(1320);
    // The formation starts 14% of the 880 extra px lower.
    expect(l.gridTop).toBe(GRID.TOP + 123);
    expect(l.bossY).toBe(BOSS.Y + 123);
    expect(l.fallScale).toBeCloseTo((1384 - l.gridTop) / (664 - GRID.TOP), 10);
    expect(l.ballSpeedScale).toBeCloseTo(Math.pow(l.fallScale, BALL_SPEED_SCALE_EXPONENT), 10);
  });

  it('a tall world draws bigger pieces, and caps how far the formation moves down', () => {
    const l = worldLayout(1600);
    expect(l.brickH).toBe(TALL.STRIDE_Y - 4);
    expect(l.strideY).toBe(TALL.STRIDE_Y);
    expect(l.ballR).toBe(TALL.BALL_R);
    expect(l.paddleH).toBe(TALL.PADDLE_H);
    expect(l.paddleWidthScale).toBe(TALL.PADDLE_WIDTH_SCALE);
    expect(l.capsuleScale).toBe(TALL.CAPSULE_SCALE);
    expect(l.ballR).toBeGreaterThan(BALL.R);
    expect(worldLayout(2080).gridTop).toBe(GRID.TOP + TALL.GRID_PUSH_MAX);
  });

  it('even the tallest formation stays clear of the danger line', () => {
    // ~824 is the shortest tall world: a parent just taller than wide (960 - 136 HUD rows).
    for (const h of [824, 900, 1000, 1200, 1600, 2080]) {
      const l = worldLayout(h);
      expect(l.strideY).toBeGreaterThanOrEqual(GRID.STRIDE_Y);
      expect(l.strideY).toBeLessThanOrEqual(TALL.STRIDE_Y);
      expect(l.brickH).toBe(l.strideY - (GRID.STRIDE_Y - GRID.BRICK_H));
      expect(l.gridTop + GRID.MAX_ROWS * l.strideY).toBeLessThan(l.dangerY);
    }
  });

  it('2080 is the tallest world', () => {
    expect(worldLayout(5000)).toEqual(worldLayout(2080));
    expect(worldLayout(2080).paddleY).toBe(1864);
  });

  it('clamps short and invalid heights to the desktop world', () => {
    expect(worldLayout(300)).toEqual(worldLayout(720));
    expect(worldLayout(NaN)).toEqual(worldLayout(720));
    expect(worldLayout(Infinity)).toEqual(worldLayout(720));
  });
});

describe('BreakerEngine with a custom world height', () => {
  it('the default engine keeps the desktop layout', () => {
    const engine = new BreakerEngine({ seed: 1 });
    expect(engine.layout).toEqual(worldLayout(720));
    expect(engine.state.paddle.y).toBe(PADDLE.Y);
  });

  it('puts the paddle at height - 216 in a 1600 world', () => {
    const engine = new BreakerEngine({ seed: 1, height: 1600 });
    expect(engine.layout.paddleY).toBe(1384);
    expect(engine.state.paddle.y).toBe(1384);
  });

  it('builds tall bricks, a big ball and a wider, thicker paddle in a tall world', () => {
    const base = BreakerEngine.forTest({ seed: 1, layout: ['1............', '1............'] });
    const tall = BreakerEngine.forTest({ seed: 1, height: 1600, layout: ['1............', '1............'] });
    const l = tall.layout;
    const [first, second] = tall.state.bricks;
    expect(first.y).toBe(l.gridTop);
    expect(first.h).toBe(TALL.STRIDE_Y - 4);
    expect(second.y).toBe(l.gridTop + TALL.STRIDE_Y);
    expect(tall.state.balls[0].r).toBe(TALL.BALL_R);
    expect(tall.state.paddle.h).toBe(TALL.PADDLE_H);
    expect(tall.state.paddle.w).toBeCloseTo(base.state.paddle.w * TALL.PADDLE_WIDTH_SCALE, 6);
    expect(base.state.bricks[0].h).toBe(GRID.BRICK_H);
    expect(base.state.balls[0].r).toBe(BALL.R);
  });

  it('moves the core down with the formation and keeps its tall shields apart', () => {
    const engine = BreakerEngine.forTest({ seed: 2, height: 1600, boss: true, startSector: 5 });
    const core = engine.state.boss!;
    expect(core.y).toBe(engine.layout.bossY);
    const shields = engine.state.bricks.filter((b) => b.row === -1);
    expect(shields.length).toBe(8);
    for (const a of shields) {
      expect(a.h).toBe(engine.layout.brickH);
      for (const b of shields) {
        if (a === b) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).withContext(`shields ${a.col} and ${b.col}`).toBeFalse();
      }
    }
  });

  it('keeps the layout after a restart-like sector change', () => {
    const engine = new BreakerEngine({ seed: 1, height: 1600, startSector: 3 });
    expect(engine.layout.height).toBe(1600);
    expect(engine.state.paddle.y).toBe(1384);
  });

  it('a ball past y = 720 is not lost in a tall world, one past 1600 is', () => {
    const engine = BreakerEngine.forTest({ seed: 1, height: 1600, layout: ['............1'] });
    engine.update(1000 / 60, input({ launchPressed: true }));
    const b = engine.state.balls[0] as { x: number; y: number; prevX: number; prevY: number; vx: number; vy: number; stuck: boolean };
    b.stuck = false;
    b.x = b.prevX = 40;
    b.y = b.prevY = 800;
    b.vx = 0;
    b.vy = 100;
    run(engine, 200, input({ pointerX: 900 }));
    expect(engine.state.lives).toBe(3);
    expect(engine.state.balls[0].y).toBeGreaterThan(800);
    b.y = b.prevY = 1595;
    run(engine, 500, input({ pointerX: 900 }));
    expect(engine.state.lives).toBe(2);
  });

  it('a capsule falls at FALL_SPEED * fallScale', () => {
    const engine = BreakerEngine.forTest({ seed: 1, height: 1600, layout: ['......?......', '1............'] });
    engine.update(1000 / 60, input({ launchPressed: true }));
    const b = engine.state.balls[0] as { x: number; y: number; prevX: number; prevY: number; vx: number; vy: number; stuck: boolean };
    b.stuck = false;
    b.x = b.prevX = GRID.LEFT + 6 * GRID.STRIDE_X + GRID.BRICK_W / 2;
    b.y = b.prevY = engine.layout.gridTop + engine.layout.strideY + 30;
    b.vx = 0;
    b.vy = -1;
    run(engine, 400, input({ pointerX: 100 }));
    const c = engine.state.capsules[0];
    expect(c).toBeDefined();
    const y0 = c.y;
    run(engine, 1000, input({ pointerX: 100 }));
    expect(Math.abs(engine.state.capsules[0].y - y0 - CAPSULE.FALL_SPEED * engine.layout.fallScale)).toBeLessThan(10);
  });

  it('a served ball flies at the base speed times ballSpeedScale', () => {
    const base = BreakerEngine.forTest({ seed: 1, layout: ['............1'] });
    const tall = BreakerEngine.forTest({ seed: 1, height: 1600, layout: ['............1'] });
    for (const e of [base, tall]) e.update(1000 / 60, input({ launchPressed: true }));
    const speed = (e: BreakerEngine) => Math.hypot(e.state.balls[0].vx, e.state.balls[0].vy);
    expect(speed(tall) / speed(base)).toBeCloseTo(tall.layout.ballSpeedScale, 3);
  });

  it('boss pellets fall faster by fallScale', () => {
    const speedOf = (height?: number): number => {
      const engine = BreakerEngine.forTest({ seed: 2, height, boss: true, startSector: 5, params: { ballSpeed: 60 } });
      engine.update(1000 / 60, input({ launchPressed: true }));
      const b = engine.state.balls[0] as { x: number; y: number; prevX: number; prevY: number; vx: number; vy: number; stuck: boolean };
      b.stuck = false;
      b.x = b.prevX = 40;
      b.y = b.prevY = 420;
      b.vx = 0;
      b.vy = -1;
      run(engine, BOSS.FIRST_SHOT_MS + 100);
      const pellet = engine.state.boss?.pellets[0];
      expect(pellet).toBeDefined();
      return Math.hypot(pellet!.vx, pellet!.vy);
    };
    const tall = new BreakerEngine({ seed: 1, height: 1600 });
    expect(speedOf(1600) / speedOf()).toBeCloseTo(tall.layout.fallScale, 3);
  });
});
