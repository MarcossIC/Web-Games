import * as Phaser from 'phaser';
import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { startTestScene, TestScene } from '../testing/phaser-test-scene';
import PicturePool from './PicturePool';

describe('PicturePool', () => {
  let harness: TestScene;
  let pool: PicturePool;
  let others: Phaser.GameObjects.GameObject[] = [];

  beforeAll(async () => {
    harness = await startTestScene();
  });

  afterAll(() => harness?.destroy());

  beforeEach(() => {
    pool = new PicturePool(harness.scene);
  });

  afterEach(() => {
    pool.getGroup().clear(true, true);
    for (const other of others) other.destroy();
    others = [];
  });

  /** The display list as it is drawn: sorted, as the next frame would sort it. */
  const drawOrder = () => {
    harness.scene.sys.depthSort();
    return harness.scene.children.list;
  };

  it('draws a picture with its left edge at x and its centre at y', () => {
    const picture = pool.take(100, 200, RetroRunnerMedia.FLOORGRASS_CENTER);

    const bounds = picture.getBounds();
    expect(bounds.left).toBe(100);
    expect(bounds.centerY).toBe(200);
    expect(picture.texture.key).toBe(RetroRunnerMedia.FLOORGRASS_CENTER);
    expect(picture.visible).toBeTrue();
  });

  it('uses a released picture again instead of making a new one', () => {
    const first = pool.take(100, 200, RetroRunnerMedia.FLOORGRASS_START);
    pool.release(first);

    const second = pool.take(400, 250, RetroRunnerMedia.FLOORGRASS_END);

    expect(second).toBe(first);
    expect(pool.getGroup().getLength()).toBe(1);
    expect(second.texture.key).toBe(RetroRunnerMedia.FLOORGRASS_END);
    expect(second.getBounds().left).toBe(400);
    expect(second.getBounds().centerY).toBe(250);
    expect(second.active).toBeTrue();
    expect(second.visible).toBeTrue();
  });

  it('hides a released picture until it is used again', () => {
    const picture = pool.take(100, 200, RetroRunnerMedia.FLOORGRASS_START);

    pool.release(picture);

    expect(picture.active).toBeFalse();
    expect(picture.visible).toBeFalse();
  });

  it('draws a reused picture over what was drawn before it, as a new one would be', () => {
    const reused = pool.take(100, 200, RetroRunnerMedia.FLOORGRASS_END);
    const newer = pool.take(100, 200, RetroRunnerMedia.FLOORGRASS_CENTER);
    pool.release(reused);
    drawOrder();

    expect(pool.take(100, 200, RetroRunnerMedia.FLOORGRASS_START)).toBe(reused);

    const order = drawOrder();
    expect(order.indexOf(reused)).toBeGreaterThan(order.indexOf(newer));
  });

  it('keeps a reused picture under what has to be drawn on top of it', () => {
    const reused = pool.take(100, 200, RetroRunnerMedia.FLOORGRASS_END);
    pool.release(reused);
    const onTop = harness.scene.add.image(0, 0, RetroRunnerMedia.GRASS_BLOCK).setDepth(10);
    others.push(onTop);
    drawOrder();

    expect(pool.take(100, 200, RetroRunnerMedia.FLOORGRASS_START)).toBe(reused);

    const order = drawOrder();
    expect(order.indexOf(reused)).toBeLessThan(order.indexOf(onTop));
  });
});
