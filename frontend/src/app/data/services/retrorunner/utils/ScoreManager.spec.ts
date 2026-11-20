import * as Phaser from 'phaser';
import { BASE_WALK_SPEED } from '../generation/jump-model';
import { startTestScene, TestScene } from '../testing/phaser-test-scene';
import { memoryStore } from '@app-persistence';
import { runnerRecords } from '../runner-saves';
import { hudLayout, runnerLayout } from './runner-layout';
import ScoreManager from './ScoreManager';

const FRAME_MS = 1000 / 60;

describe('ScoreManager', () => {
  let harness: TestScene;
  let savedBest: string | null;

  beforeAll(async () => {
    harness = await startTestScene();
  });

  afterAll(() => harness?.destroy());

  beforeEach(() => {
    savedBest = localStorage.getItem(runnerRecords.key);
    localStorage.removeItem(runnerRecords.key);
  });

  afterEach(() => {
    for (const text of texts()) text.destroy();
    if (savedBest === null) localStorage.removeItem(runnerRecords.key);
    else localStorage.setItem(runnerRecords.key, savedBest);
  });

  const texts = () =>
    harness.scene.children.list.filter((child): child is Phaser.GameObjects.Text => child.type === 'Text');
  const hud = (prefix: string) => texts().find((text) => text.text.startsWith(prefix))?.text;

  /** Runs at `speed` px/s for `ms`, the way GameScene calls update. */
  const run = (manager: ScoreManager, fromX: number, speed: number, ms: number) => {
    let x = fromX;
    for (let t = 0; t < ms; t += FRAME_MS) {
      x += (speed * FRAME_MS) / 1000;
      manager.update(x, FRAME_MS, BASE_WALK_SPEED);
    }
    return x;
  };

  it('shows the score of the run', () => {
    const manager = new ScoreManager(harness.scene, 0);
    manager.createHUD();

    manager.update(1234, FRAME_MS, BASE_WALK_SPEED);

    expect(hud('Score')).toBe('Score: 123');
    expect(manager.getScore()).toBe(123);
  });

  it('marks the rhythm next to the score while it lasts', () => {
    const manager = new ScoreManager(harness.scene, 0);
    manager.createHUD();

    const x = run(manager, 0, BASE_WALK_SPEED, 1500);
    expect(hud('Score')).toBe(`Score: ${manager.getScore()}  x1.5`);

    run(manager, x, 0, 500);
    expect(hud('Score')).toBe(`Score: ${manager.getScore()}`);
  });

  it('shows how long the run has lasted, in minutes and seconds', () => {
    const manager = new ScoreManager(harness.scene, 0);
    manager.createHUD();
    const clock = () => texts().find((text) => /^\d+:\d\d$/.test(text.text))?.text;
    expect(clock()).toBe('0:00');

    run(manager, 0, BASE_WALK_SPEED, 65_000);

    expect(clock()).toBe('1:05');
  });

  it('shows the saved best score', () => {
    const store = memoryStore();
    runnerRecords.write(store, { bestScore: 777 });
    const manager = new ScoreManager(harness.scene, 0, store);

    manager.createHUD();

    expect(hud('Best')).toBe('Best: 777');
  });

  it('draws the desktop line unless told where: score on the left, best at the right edge', () => {
    const manager = new ScoreManager(harness.scene, 0);

    manager.createHUD();

    const score = texts().find((text) => text.text.startsWith('Score'))!;
    const best = texts().find((text) => text.text.startsWith('Best'))!;
    expect([score.x, score.y, score.originX]).toEqual([10, 8, 0]);
    expect([best.x, best.y, best.originX]).toEqual([540, 8, 1]);
  });

  it('moves its lines when the screen changes shape, clear of the pause key', () => {
    const manager = new ScoreManager(harness.scene, 0);
    manager.createHUD();
    const upright = runnerLayout(390, 763, true);

    manager.place(hudLayout(upright));

    const score = texts().find((text) => text.text.startsWith('Score'))!;
    const best = texts().find((text) => text.text.startsWith('Best'))!;
    const clock = texts().find((text) => /^\d+:\d\d$/.test(text.text))!;
    // Stacked on the left, and the clock ends before the corner of pause.
    expect(best.x).toBe(score.x);
    expect(best.y).toBeGreaterThan(score.y);
    expect(clock.originX).toBe(1);
    expect(clock.x).toBeLessThan(upright.controls!.pause.zone.x);
  });

  it('scores the coins into the run', () => {
    const manager = new ScoreManager(harness.scene, 0);

    expect(manager.collectCoin(1000)).toEqual({ combo: 1, points: 4 });
    expect(manager.collectCoin(1200)).toEqual({ combo: 2, points: 5 });

    const summary = manager.getSummary();
    expect(summary.coins).toBe(2);
    expect(summary.coinPoints).toBe(9);
    expect(summary.maxCombo).toBe(2);
  });
});
