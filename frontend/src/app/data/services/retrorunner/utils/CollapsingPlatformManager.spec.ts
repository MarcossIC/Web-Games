import * as Phaser from 'phaser';
import { startTestScene, TestScene, TEST_FLOOR_Y } from '../testing/phaser-test-scene';
import CollapsingPlatformManager from './CollapsingPlatformManager';

const SURFACE_Y = TEST_FLOOR_Y - 17;

describe('CollapsingPlatformManager', () => {
  let harness: TestScene;
  let manager: CollapsingPlatformManager;

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
  });

  /** The bridge's blocks, left to right. */
  const bodies = () =>
    manager
      .getGroup()
      .getChildren()
      .map((child) => (child as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody)
      .sort((a, b) => a.left - b.left);

  const liveTweens = () =>
    harness.scene.tweens.getTweens().filter((tween) => !tween.isDestroyed()).length;

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

  describe('recycling', () => {
    it('removes blocks left behind, even if nobody stepped on them, with their tweens', () => {
      manager.spawnBridge(100, 200, TEST_FLOOR_Y);
      expect(liveTweens()).toBeGreaterThan(0);

      manager.recycle(2000);

      expect(manager.getGroup().getLength()).toBe(0);
      expect(liveTweens()).toBe(0);
    });

    it('keeps the blocks that are still ahead', () => {
      manager.spawnBridge(3000, 3100, TEST_FLOOR_Y);

      manager.recycle(2000);

      expect(manager.getGroup().getLength()).toBe(4);
    });
  });
});
