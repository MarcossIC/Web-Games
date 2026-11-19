import { BreakerEngine, IDLE_INPUT } from './breaker-engine';
import { GRID, RESCUE, STEP } from './config';
import type { Ball, BreakerEvent, BreakerInput } from './types';

type EventOf<T extends BreakerEvent['type']> = Extract<BreakerEvent, { type: T }>;

const FRAME = 1000 / 60;
const LAUNCH: BreakerInput = { ...IDLE_INPUT, launchPressed: true };

function run(engine: BreakerEngine, ms: number, each: BreakerInput = IDLE_INPUT): BreakerEvent[] {
  const events: BreakerEvent[] = [];
  for (let t = 0; t < ms; t += FRAME) events.push(...engine.update(FRAME, each));
  return events;
}

function ofType<T extends BreakerEvent['type']>(events: readonly BreakerEvent[], type: T): EventOf<T>[] {
  return events.filter((e): e is EventOf<T> => e.type === type);
}

function aim(engine: BreakerEngine, x: number, y: number, vx: number, vy: number): Ball {
  if (engine.state.phase === 'serve') engine.update(STEP.MS, LAUNCH);
  const b = engine.state.balls[0] as Ball;
  b.stuck = false;
  b.x = b.prevX = x;
  b.y = b.prevY = y;
  b.vx = vx;
  b.vy = vy;
  return b;
}

function colX(col: number): number {
  return GRID.LEFT + col * GRID.STRIDE_X + GRID.BRICK_W / 2;
}

function rowBottom(row: number): number {
  return GRID.TOP + row * GRID.STRIDE_Y + GRID.BRICK_H;
}

/**
 * A ball that drops straight onto the middle of a still paddle and goes
 * straight back up, forever: it never comes near the corner brick.
 */
function stalled(layout: readonly string[], ballSpeed: number): BreakerEngine {
  const engine = BreakerEngine.forTest({ seed: 1, layout, params: { ballSpeed } });
  aim(engine, engine.state.paddle.x, 400, 0, 1);
  return engine;
}

describe('BreakerEngine: anti-stall rescue', () => {
  describe('the rescue capsule', () => {
    it('drops one after 12 s with no brick hit, from over the bricks left, alternating multi and fire', () => {
      const engine = stalled(['............2'], 120);
      let events = run(engine, RESCUE.IDLE_MS - 300);
      expect(ofType(events, 'rescue').length).toBe(0);

      events = run(engine, 600);
      const first = ofType(events, 'rescue');
      expect(first.length).toBe(1);
      expect(first[0].mode).toBe('capsule');
      expect(first[0].kind).toBe('multi');
      expect(first[0].x).toBeCloseTo(colX(12), 6);
      const spawned = ofType(events, 'capsule-spawned');
      expect(spawned.length).toBe(1);
      expect(spawned[0].kind).toBe('multi');
      expect(engine.state.capsules.length).toBe(1);

      // At most one every 12 s.
      events = run(engine, RESCUE.IDLE_MS - 600);
      expect(ofType(events, 'rescue').length).toBe(0);
      events = run(engine, 900);
      const second = ofType(events, 'rescue');
      expect(second.length).toBe(1);
      expect(second[0].kind).toBe('fire');
    });

    it('drops a laser when steel is most of what is left', () => {
      const engine = stalled(['#####...#####', '..........2..'], 120);
      const events = run(engine, RESCUE.IDLE_MS + 300);
      const rescue = ofType(events, 'rescue');
      expect(rescue.length).toBe(1);
      expect(rescue[0].kind).toBe('laser');
    });

    it('waits again from zero after a brick is hit', () => {
      const engine = stalled(['............2'], 120);
      run(engine, RESCUE.IDLE_MS - 1000);
      aim(engine, colX(12), rowBottom(0) + 20, 0, -1);
      let events = run(engine, 400);
      expect(ofType(events, 'brick-hit').length).toBe(1);
      aim(engine, engine.state.paddle.x, 400, 0, 1);
      events = run(engine, RESCUE.IDLE_MS - 1000);
      expect(ofType(events, 'rescue').length).toBe(0);
    });

    it('never comes when only steel is left, nor during a serve', () => {
      const steel = stalled(['#............'], 120);
      expect(ofType(run(steel, RESCUE.IDLE_MS + 1000), 'rescue').length).toBe(0);

      const serving = BreakerEngine.forTest({ seed: 1, layout: ['............2'] });
      expect(ofType(run(serving, RESCUE.IDLE_MS + 1000), 'rescue').length).toBe(0);
      expect(serving.state.phase).toBe('serve');
    });
  });

  describe('the nudge', () => {
    it('after 8 dry paddle hits, bends the next bounce a few degrees towards the nearest brick', () => {
      const engine = stalled(['............2'], 1500);
      const angles: number[] = [];
      const nudges: EventOf<'rescue'>[] = [];
      for (let t = 0; t < 9000 && angles.length < RESCUE.DRY_PADDLE_HITS + 1; t += FRAME) {
        const events = engine.update(FRAME, IDLE_INPUT);
        nudges.push(...ofType(events, 'rescue'));
        if (ofType(events, 'paddle-hit').length > 0) {
          const b = engine.state.balls[0];
          angles.push((Math.atan2(b.vx, -b.vy) * 180) / Math.PI);
        }
      }
      expect(angles.length).toBe(RESCUE.DRY_PADDLE_HITS + 1);
      for (let i = 0; i < RESCUE.DRY_PADDLE_HITS; i++) expect(angles[i]).withContext(`hit ${i + 1}`).toBeCloseTo(0, 6);
      const bent = angles[RESCUE.DRY_PADDLE_HITS];
      // Towards column 12, on the right, by the nudge and no more.
      expect(bent).toBeGreaterThan(0);
      expect(bent).toBeLessThanOrEqual(RESCUE.NUDGE_DEG + 1e-6);
      expect(nudges.length).toBe(1);
      expect(nudges[0].mode).toBe('nudge');
      expect(nudges[0].kind).toBeNull();
      expect(nudges[0].x).toBeCloseTo(colX(12), 6);
    });

    it('leaves bounces alone while bricks keep getting hit', () => {
      const engine = BreakerEngine.forTest({ seed: 1, layout: ['3333333333333'], params: { ballSpeed: 900 } });
      aim(engine, engine.state.paddle.x, 400, 0, 1);
      const events = run(engine, 6000);
      expect(ofType(events, 'brick-hit').length).toBeGreaterThan(0);
      expect(ofType(events, 'rescue').filter((e) => e.mode === 'nudge').length).toBe(0);
    });
  });
});
