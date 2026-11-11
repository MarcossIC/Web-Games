import * as Phaser from 'phaser';
import { BASE_WALK_SPEED } from '../generation/jump-model';
import { startTestScene, TestScene } from '../testing/phaser-test-scene';
import { BEST_SCORE_KEY } from './run-score';
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
    savedBest = localStorage.getItem(BEST_SCORE_KEY);
    localStorage.removeItem(BEST_SCORE_KEY);
  });

  afterEach(() => {
    for (const text of texts()) text.destroy();
    if (savedBest === null) localStorage.removeItem(BEST_SCORE_KEY);
    else localStorage.setItem(BEST_SCORE_KEY, savedBest);
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

  it('shows the best score of this scoring, not the one kept before it', () => {
    localStorage.setItem(BEST_SCORE_KEY, '777');
    const manager = new ScoreManager(harness.scene, 0);

    manager.createHUD();

    expect(hud('Best')).toBe('Best: 777');
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
