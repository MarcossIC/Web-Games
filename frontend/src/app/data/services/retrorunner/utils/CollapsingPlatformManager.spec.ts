import * as Phaser from 'phaser';
import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { startTestScene, TestScene, TEST_FLOOR_Y } from '../testing/phaser-test-scene';
import CollapsingPlatformManager, { breathingScale } from './CollapsingPlatformManager';

const SURFACE_Y = TEST_FLOOR_Y - 17;
/** How long a block holds the player before it starts shaking. */
const COLLAPSE_DELAY_MS = 450;

type Sprite = Phaser.Physics.Arcade.Sprite;
type StaticBody = Phaser.Physics.Arcade.StaticBody;

describe('breathingScale', () => {
  // What each block's own tween did before: scaleY from 1 to 0.95 in 600 ms
  // with Sine.easeInOut, and back, forever.
  const tweened = (now: number) => {
    const t = now % 1200;
    const progress = t <= 600 ? t / 600 : (1200 - t) / 600;
    return 1 - 0.05 * Phaser.Math.Easing.Sine.InOut(progress);
  };

  it('breathes as the tween each block used to have', () => {
    for (const now of [0, 75, 150, 300, 450, 600, 777, 900, 1200, 1350, 5000, 123456]) {
      expect(breathingScale(now)).withContext(`at ${now} ms`).toBeCloseTo(tweened(now), 10);
    }
  });

  it('goes from full height to 95 % and back every 1.2 s', () => {
    expect(breathingScale(0)).toBe(1);
    expect(breathingScale(600)).toBeCloseTo(0.95, 10);
    expect(breathingScale(1200)).toBeCloseTo(1, 10);
  });
});

describe('CollapsingPlatformManager', () => {
  let harness: TestScene;
  let manager: CollapsingPlatformManager;
  let others: Phaser.GameObjects.GameObject[] = [];

  beforeAll(async () => {
    harness = await startTestScene();
  });

  afterAll(() => harness?.destroy());

  beforeEach(() => {
    manager = new CollapsingPlatformManager(harness.scene);
  });

  afterEach(() => {
    harness.scene.tweens.killAll();
    manager.getGroup().clear(true, true);
    for (const other of others) other.destroy();
    others = [];
  });

  const activeBlocks = () => (manager.getGroup().getChildren() as Sprite[]).filter((block) => block.active);

  /** The bridge's blocks, left to right. */
  const bodies = () =>
    activeBlocks()
      .map((block) => block.body as StaticBody)
      .sort((a, b) => a.left - b.left);

  const liveTweens = () => harness.scene.tweens.getTweens().filter((tween) => !tween.isDestroyed()).length;

  /** Someone whose feet are at `bottom`: all the manager reads of the player. */
  const playerWithFeetAt = (bottom: number) => ({ body: { bottom } }) as unknown as Sprite;

  describe('a bridge', () => {
    it('covers the whole hole, with no space between its blocks', () => {
      manager.spawnBridge(1000, 1150, TEST_FLOOR_Y);

      const blocks = bodies();
      expect(blocks.length).toBe(5);
      expect(blocks[0].left).toBeLessThanOrEqual(1000);
      expect(blocks[blocks.length - 1].right).toBeGreaterThanOrEqual(1150);
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i].left).toBeCloseTo(blocks[i - 1].right, 5);
      }
    });

    it('lies level with the floor on both sides', () => {
      manager.spawnBridge(1000, 1150, TEST_FLOOR_Y);

      for (const block of bodies()) expect(block.top).toBeCloseTo(SURFACE_Y, 5);
    });

    it('overhangs both edges by the same amount', () => {
      manager.spawnBridge(1000, 1150, TEST_FLOOR_Y);

      const blocks = bodies();
      const overLeft = 1000 - blocks[0].left;
      const overRight = blocks[blocks.length - 1].right - 1150;
      expect(overLeft).toBeCloseTo(overRight, 5);
    });

    it('still bridges a hole narrower than one block', () => {
      manager.spawnBridge(1000, 1025, TEST_FLOOR_Y);

      const blocks = bodies();
      expect(blocks.length).toBe(1);
      expect(blocks[0].left).toBeLessThanOrEqual(1000);
      expect(blocks[0].right).toBeGreaterThanOrEqual(1025);
    });
  });

  describe('breathing', () => {
    it('needs no tween of its own: every block follows the same clock', () => {
      const bridge = manager.spawnBridge(1000, 1150, TEST_FLOOR_Y);
      expect(liveTweens()).toBe(0);

      manager.updateBlocks(300);

      for (const block of bridge) expect(block.scaleY).toBeCloseTo(breathingScale(300), 10);
    });

    it('stops for a block that started to collapse', () => {
      const bridge = manager.spawnBridge(1000, 1150, TEST_FLOOR_Y);
      const now = harness.scene.time.now;
      manager.onPlayerCollide(playerWithFeetAt(SURFACE_Y), bridge[2]);

      manager.updateBlocks(now + COLLAPSE_DELAY_MS + 300);

      expect(bridge[2].scaleY).toBe(1);
      expect(bridge[1].scaleY).toBeCloseTo(breathingScale(now + COLLAPSE_DELAY_MS + 300), 10);
    });
  });

  describe('collapsing', () => {
    it('shakes a block once the player has stood on it long enough', () => {
      const bridge = manager.spawnBridge(1000, 1150, TEST_FLOOR_Y);
      const now = harness.scene.time.now;

      manager.onPlayerCollide(playerWithFeetAt(SURFACE_Y), bridge[0]);
      manager.updateBlocks(now + COLLAPSE_DELAY_MS - 1);
      expect(liveTweens()).toBe(0);

      manager.updateBlocks(now + COLLAPSE_DELAY_MS);
      expect(harness.scene.tweens.getTweensOf(bridge[0]).length).toBe(1);
      expect(liveTweens()).toBe(1);
    });

    it('ignores a player touching a block from below or from the side', () => {
      const bridge = manager.spawnBridge(1000, 1150, TEST_FLOOR_Y);
      const now = harness.scene.time.now;

      manager.onPlayerCollide(playerWithFeetAt(SURFACE_Y + 9), bridge[0]);
      manager.updateBlocks(now + COLLAPSE_DELAY_MS * 3);

      expect(liveTweens()).toBe(0);
    });

    it('ignores a block it no longer holds', () => {
      const bridge = manager.spawnBridge(1000, 1150, TEST_FLOOR_Y);
      const now = harness.scene.time.now;
      manager.release(bridge);

      manager.onPlayerCollide(playerWithFeetAt(SURFACE_Y), bridge[0]);
      manager.updateBlocks(now + COLLAPSE_DELAY_MS * 3);

      expect(liveTweens()).toBe(0);
    });
  });

  describe('releasing', () => {
    it('takes a bridge away, even if nobody stepped on it', () => {
      const bridge = manager.spawnBridge(100, 200, TEST_FLOOR_Y);

      manager.release(bridge);

      expect(activeBlocks().length).toBe(0);
      for (const block of bridge) {
        expect(block.visible).toBeFalse();
        expect(block.body!.enable).toBeFalse();
      }
    });

    it('stops the tweens of a block that was collapsing', () => {
      const bridge = manager.spawnBridge(100, 200, TEST_FLOOR_Y);
      const now = harness.scene.time.now;
      manager.onPlayerCollide(playerWithFeetAt(SURFACE_Y), bridge[0]);
      manager.updateBlocks(now + COLLAPSE_DELAY_MS);
      expect(liveTweens()).toBe(1);

      manager.release(bridge);

      expect(liveTweens()).toBe(0);
    });

    it('keeps the other bridges', () => {
      const behind = manager.spawnBridge(100, 200, TEST_FLOOR_Y);
      manager.spawnBridge(3000, 3100, TEST_FLOOR_Y);

      manager.release(behind);

      expect(activeBlocks().length).toBe(4);
    });

    it('builds the next bridge with the blocks it took back, as good as new', () => {
      const old = manager.spawnBridge(100, 230, TEST_FLOOR_Y);
      // How a block is left after it fell: lower, faded, hidden, with no body.
      old[0].setY(old[0].y + 100).setAlpha(0).setScale(1, 0.97).setActive(false).setVisible(false);
      old[0].body!.enable = false;
      manager.release(old);

      const bridge = manager.spawnBridge(3000, 3130, TEST_FLOOR_Y);

      expect(manager.getGroup().getLength()).toBe(old.length);
      expect(bridge.length).toBe(old.length);
      for (const block of bridge) {
        expect(old).toContain(block);
        expect(block.active).toBeTrue();
        expect(block.visible).toBeTrue();
        expect(block.alpha).toBe(1);
        expect(block.scaleX).toBe(1);
        expect(block.scaleY).toBe(1);
        expect(block.body!.enable).toBeTrue();
        expect((block.body as StaticBody).top).toBeCloseTo(SURFACE_Y, 5);
      }
      const blocks = bodies();
      expect(blocks[0].left).toBeLessThanOrEqual(3000);
      expect(blocks[blocks.length - 1].right).toBeGreaterThanOrEqual(3130);
    });

    it('lets a block it took back collapse again', () => {
      const old = manager.spawnBridge(100, 200, TEST_FLOOR_Y);
      const now = harness.scene.time.now;
      manager.onPlayerCollide(playerWithFeetAt(SURFACE_Y), old[0]);
      manager.release(old);

      const bridge = manager.spawnBridge(3000, 3100, TEST_FLOOR_Y);
      manager.updateBlocks(now + COLLAPSE_DELAY_MS * 3);
      expect(liveTweens()).toBe(0);

      manager.onPlayerCollide(playerWithFeetAt(SURFACE_Y), bridge[0]);
      manager.updateBlocks(now + COLLAPSE_DELAY_MS);
      expect(liveTweens()).toBe(1);
    });

    it('draws a reused block over what was built after its first use', () => {
      const old = manager.spawnBridge(100, 200, TEST_FLOOR_Y);
      manager.release(old);
      const floorTile = harness.scene.add.image(0, 0, RetroRunnerMedia.FLOORGRASS_END);
      others.push(floorTile);
      harness.scene.sys.depthSort();

      const bridge = manager.spawnBridge(3000, 3100, TEST_FLOOR_Y);

      harness.scene.sys.depthSort();
      const order = harness.scene.children.list;
      for (const block of bridge) expect(order.indexOf(block)).toBeGreaterThan(order.indexOf(floorTile));
    });
  });
});
