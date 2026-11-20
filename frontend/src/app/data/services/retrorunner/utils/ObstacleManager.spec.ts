import * as Phaser from 'phaser';
import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { startTestScene, TestScene, TEST_FLOOR_Y } from '../testing/phaser-test-scene';
import ObstacleManager from './ObstacleManager';

const SURFACE_Y = TEST_FLOOR_Y - 17;

describe('ObstacleManager', () => {
  let harness: TestScene;
  let manager: ObstacleManager;

  beforeAll(async () => {
    harness = await startTestScene();
  });

  afterAll(() => harness?.destroy());

  beforeEach(() => {
    manager = new ObstacleManager(harness.scene);
  });

  afterEach(() => manager.getGroup().clear(true, true));

  const activeStones = () =>
    manager
      .getGroup()
      .getChildren()
      .filter((child) => child.active) as Phaser.Physics.Arcade.Sprite[];

  /** The hitbox is the lower 70 % of the stone and its middle 60 %. */
  const expectSmallHitbox = (stone: Phaser.Physics.Arcade.Sprite) => {
    const body = stone.body as Phaser.Physics.Arcade.StaticBody;
    expect(body.width).toBeCloseTo(stone.displayWidth * 0.6, 5);
    expect(body.height).toBeCloseTo(stone.displayHeight * 0.7, 5);
    expect(body.left + body.width / 2).toBeCloseTo(stone.x, 5);
    expect(body.bottom).toBeCloseTo(SURFACE_Y, 5);
  };

  it('gives a stone a hitbox smaller than its picture, standing on the floor', () => {
    manager.spawn(1200, TEST_FLOOR_Y, RetroRunnerMedia.STONE_3);

    const [stone] = activeStones();
    expect(stone).toBeDefined();
    expectSmallHitbox(stone);
  });

  it('gives a released stone, used again, the hitbox of its new picture', () => {
    const first = manager.spawn(1200, TEST_FLOOR_Y, RetroRunnerMedia.STONE_1);
    manager.release(first);
    manager.spawn(6200, TEST_FLOOR_Y, RetroRunnerMedia.STONE_9);

    const stones = activeStones();
    expect(manager.getGroup().getLength()).toBe(1);
    expect(stones.length).toBe(1);
    expect(stones[0].texture.key).toBe(RetroRunnerMedia.STONE_9);
    expectSmallHitbox(stones[0]);
  });

  it('takes a released stone out of play', () => {
    const stone = manager.spawn(1200, TEST_FLOOR_Y, RetroRunnerMedia.STONE_1);
    manager.release(stone);

    expect(activeStones()).toEqual([]);
    expect(stone.visible).toBeFalse();
    expect(stone.body!.enable).toBeFalse();
  });
});
