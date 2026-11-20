import { BASE_WALK_SPEED } from '../generation/jump-model';
import { WorldGenerator } from '../generation/world-generator';
import { TEST_FLOOR_Y } from '../testing/phaser-test-scene';
import { formatRunTime, RunScore, SCORING } from './run-score';

const FRAME_MS = 1000 / 60;
const TOP = BASE_WALK_SPEED;

/**
 * Moves a run forward frame by frame at `speed` px/s for `ms`, the way
 * GameScene feeds it, and returns where the player ended.
 */
function runFor(score: RunScore, fromX: number, speed: number, ms: number, topSpeed = TOP): number {
  let x = fromX;
  for (let t = 0; t < ms; t += FRAME_MS) {
    x += (speed * FRAME_MS) / 1000;
    score.advance(x, FRAME_MS, topSpeed);
  }
  return x;
}

describe('RunScore', () => {
  describe('distance', () => {
    it('gives a point for every 10 px of ground covered', () => {
      const score = new RunScore(50);

      score.advance(50 + 1234, FRAME_MS, TOP);

      expect(score.distance).toBe(123);
    });

    it('takes no points away for walking back, nor gives them twice', () => {
      const score = new RunScore(0);
      score.advance(500, FRAME_MS, TOP);

      score.advance(200, FRAME_MS, TOP);
      expect(score.distance).toBe(50);

      score.advance(600, FRAME_MS, TOP);
      expect(score.distance).toBe(60);
    });
  });

  describe('coins', () => {
    it('are worth a fixed 4 points each when picked up alone', () => {
      const score = new RunScore(0);

      expect(score.collectCoin(1000)).toEqual({ combo: 1, points: 4 });
      expect(score.collectCoin(5000)).toEqual({ combo: 1, points: 4 });
      expect(score.summary().coinPoints).toBe(8);
    });

    it('add a point for each further coin of a combo, up to x5', () => {
      const score = new RunScore(0);

      const picked = [0, 200, 400, 600, 800, 1000].map((now) => score.collectCoin(now));

      expect(picked).toEqual([
        { combo: 1, points: 4 },
        { combo: 2, points: 5 },
        { combo: 3, points: 6 },
        { combo: 4, points: 7 },
        { combo: 5, points: 8 },
        { combo: 5, points: 8 },
      ]);
    });

    it('start a new combo after a pause of 1.5 s', () => {
      const score = new RunScore(0);
      score.collectCoin(0);
      score.collectCoin(1000);

      expect(score.collectCoin(1000 + SCORING.COMBO_WINDOW_MS).combo).toBe(1);
    });

    it('are counted, with the best combo of the run', () => {
      const score = new RunScore(0);
      for (const now of [0, 300, 600, 5000, 5300, 9000]) score.collectCoin(now);

      const run = score.summary();

      expect(run.coins).toBe(6);
      expect(run.maxCombo).toBe(3);
    });

    it('add a small share next to the distance, even picking up every coin of a world', () => {
      for (const seed of ['A1B2C3D4', '00000001', 'CAFEBABE', '7F3A9C21']) {
        const generator = new WorldGenerator({ key: seed, floorY: TEST_FLOOR_Y });
        const coinXs: number[] = [];
        for (let plan = generator.next(); plan.startX < 30000; plan = generator.next()) {
          for (const piece of plan.pieces) if (piece.type === 'coin') coinXs.push(piece.x);
        }
        coinXs.sort((a, b) => a - b);

        const score = new RunScore(0);
        score.advance(30000, FRAME_MS, TOP);
        for (const x of coinXs) score.collectCoin((x / TOP) * 1000);

        const run = score.summary();
        expect(run.coinPoints / run.distance).withContext(seed).toBeLessThan(0.2);
      }
    });
  });

  describe('rhythm', () => {
    it('starts once the player has kept the pace for a second', () => {
      const score = new RunScore(0);

      let x = runFor(score, 0, TOP, SCORING.RHYTHM_AFTER_MS - 50);
      expect(score.inRhythm).toBeFalse();

      x = runFor(score, x, TOP, 100);
      expect(score.inRhythm).toBeTrue();
    });

    it('makes each point of distance worth 1.5 while it lasts', () => {
      const score = new RunScore(0);
      const x = runFor(score, 0, TOP, SCORING.RHYTHM_AFTER_MS + 50);
      const distanceBefore = score.distance;
      const rhythmBefore = score.summary().rhythmPoints;

      runFor(score, x, TOP, 5000);

      const gained = score.distance - distanceBefore;
      expect(gained).toBeGreaterThan(80);
      expect(score.summary().rhythmPoints - rhythmBefore).toBeCloseTo(gained * SCORING.RHYTHM_BONUS, 5);
    });

    it('lives through a short slowdown, like the jump off a ledge', () => {
      const score = new RunScore(0);
      let x = runFor(score, 0, TOP, 1500);

      x = runFor(score, x, TOP * 0.7, SCORING.RHYTHM_GRACE_MS - 100);

      expect(score.inRhythm).toBeTrue();
    });

    it('breaks when the player slows down for longer, and has to be earned again', () => {
      const score = new RunScore(0);
      let x = runFor(score, 0, TOP, 1500);

      x = runFor(score, x, TOP * 0.5, SCORING.RHYTHM_GRACE_MS + 50);
      expect(score.inRhythm).toBeFalse();

      x = runFor(score, x, TOP, 500);
      expect(score.inRhythm).toBeFalse();
    });

    it('breaks for standing still, and for walking back', () => {
      const standing = new RunScore(0);
      const x = runFor(standing, 0, TOP, 1500);
      runFor(standing, x, 0, SCORING.RHYTHM_GRACE_MS + 50);
      expect(standing.inRhythm).toBeFalse();

      const walkingBack = new RunScore(0);
      const y = runFor(walkingBack, 0, TOP, 1500);
      runFor(walkingBack, y, -TOP, SCORING.RHYTHM_GRACE_MS + 50);
      expect(walkingBack.inRhythm).toBeFalse();
    });

    it('asks for the top speed of the place: the base speed is too slow where the run is faster', () => {
      const score = new RunScore(0);

      runFor(score, 0, TOP, 3000, TOP * 1.4);

      expect(score.inRhythm).toBeFalse();
    });

    it('scores a run that stops before each jump lower than one that keeps going', () => {
      const flowing = new RunScore(0);
      runFor(flowing, 0, TOP, 20000);

      const stopping = new RunScore(0);
      let x = 0;
      while (x < flowing.furthestX) {
        x = runFor(stopping, x, TOP, 1500);
        x = runFor(stopping, x, 0, 500);
      }

      expect(stopping.distance).toBeGreaterThanOrEqual(flowing.distance);
      expect(stopping.score).toBeLessThan(flowing.score);
      expect(flowing.score / flowing.distance).toBeGreaterThan(1.4);
    });
  });

  describe('time', () => {
    it('counts how long the run was played, from the frames it got', () => {
      const score = new RunScore(0);

      // Two seconds running, then one standing still: 180 frames.
      for (let frame = 1; frame <= 120; frame++) score.advance(frame * 3, FRAME_MS, TOP);
      for (let frame = 1; frame <= 60; frame++) score.advance(360, FRAME_MS, TOP);

      expect(score.timeMs).toBeCloseTo(3000, 5);
      expect(score.summary().timeMs).toBe(score.timeMs);
    });
  });

  describe('formatRunTime', () => {
    it('shows minutes and seconds, the seconds always with two digits', () => {
      expect(formatRunTime(0)).toBe('0:00');
      expect(formatRunTime(9_999)).toBe('0:09');
      expect(formatRunTime(61_000)).toBe('1:01');
      expect(formatRunTime(3_725_000)).toBe('62:05');
    });
  });

  it('adds up the distance and the points: coins and rhythm', () => {
    const score = new RunScore(0);
    runFor(score, 0, TOP, 4000);
    score.collectCoin(100);
    score.collectCoin(300);

    const run = score.summary();

    expect(run.points).toBe(Math.floor(run.coinPoints + run.rhythmPoints));
    expect(run.score).toBe(run.distance + run.points);
    expect(score.score).toBe(run.score);
  });
});
