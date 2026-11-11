import * as Phaser from 'phaser';
import { RetroRunnerKey, RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { BridgePiece, ChunkPlan, CoinPiece, PlatformPiece, Piece, StonePiece } from '../generation/chunk-plan';
import { FLOOR_SURFACE_ABOVE_Y, floorRunEnd, TILE } from '../generation/geometry';
import { WorldGenerator } from '../generation/world-generator';
import { startTestScene, TestScene, TEST_FLOOR_Y } from '../testing/phaser-test-scene';
import CoinManager from './CoinManager';
import CollapsingPlatformManager from './CollapsingPlatformManager';
import DecorationManager from './DecorationManager';
import ObstacleManager from './ObstacleManager';
import ScoreManager from './ScoreManager';
import WorldBuilder, { WorldPools } from './WorldBuilder';

/** How far behind the camera a chunk has to end to be released. */
const RELEASE_DISTANCE = 600;

interface World {
  builder: WorldBuilder;
  pools: WorldPools;
}

type Sprite = Phaser.GameObjects.Sprite;

describe('WorldBuilder', () => {
  let harness: TestScene;
  let worlds: World[] = [];

  beforeAll(async () => {
    harness = await startTestScene();
    // The coin's spritesheet is not loaded (Karma cannot serve the space in
    // its path); an animation with the placeholder frame stands in for it.
    if (!harness.scene.anims.exists(RetroRunnerKey.COIN_ANIM)) {
      harness.scene.anims.create({ key: RetroRunnerKey.COIN_ANIM, frames: [{ key: '__MISSING' }] });
    }
  });

  afterAll(() => harness?.destroy());

  afterEach(() => {
    for (const { builder, pools } of worlds) {
      builder.releaseAll();
      for (const group of [
        builder.floor,
        builder.scenery,
        pools.stones.getGroup(),
        pools.coins.getGroup(),
        pools.decoration.getGroup(),
        pools.bridges.getGroup(),
      ]) {
        group.clear(true, true);
      }
    }
    harness.scene.tweens.killAll();
    worlds = [];
  });

  /**
   * Builds a world the way GameScene does: the camera moves forward, the
   * world is filled ahead of it and, if asked, released behind it.
   */
  const build = (seed: string, options: { endX?: number; stepPx?: number; release?: boolean } = {}) => {
    const endX = options.endX ?? 6000;
    const step = options.stepPx ?? endX;
    const scene = harness.scene;
    const pools: WorldPools = {
      stones: new ObstacleManager(scene),
      coins: new CoinManager(scene, new ScoreManager(scene, 0)),
      decoration: new DecorationManager(scene),
      bridges: new CollapsingPlatformManager(scene),
    };
    const builder = new WorldBuilder(scene, new WorldGenerator({ key: seed, floorY: TEST_FLOOR_Y }), pools);
    worlds.push({ builder, pools });

    for (let x = 0; x < endX; x += step) {
      builder.fillAhead(x);
      if (options.release) builder.releaseBehind(x);
    }
    builder.fillAhead(endX);
    if (options.release) builder.releaseBehind(endX);
    return { builder, pools };
  };

  const children = (group: Phaser.GameObjects.Group) => group.getChildren() as Sprite[];
  const active = (group: Phaser.GameObjects.Group) => children(group).filter((child) => child.active);
  const piecesOf = <T extends Piece['type']>(plans: readonly ChunkPlan[], type: T) =>
    plans.flatMap((plan) => plan.pieces.filter((p): p is Extract<Piece, { type: T }> => p.type === type));

  /** The tiles, blocks and invisible platforms the plans ask for, in order. */
  const plannedSolids = (plans: readonly ChunkPlan[]) =>
    plans.flatMap((plan) =>
      plan.pieces.flatMap((piece) => {
        switch (piece.type) {
          case 'floor': {
            const tiles = [`${RetroRunnerMedia.FLOORGRASS_START}@${piece.x},${piece.y}`];
            for (let i = 0; i < piece.centerTiles; i++) {
              tiles.push(`${RetroRunnerMedia.FLOORGRASS_CENTER}@${piece.x + TILE.START_WIDTH + i * TILE.CENTER_WIDTH},${piece.y}`);
            }
            tiles.push(`${RetroRunnerMedia.FLOORGRASS_END}@${floorRunEnd(piece.x, piece.centerTiles)},${piece.y}`);
            return tiles;
          }
          case 'block':
            return [`${RetroRunnerMedia.GRASS_BLOCK}@${piece.x},${piece.y}`];
          case 'platform':
            return [`invisBlock@${piece.x},${piece.y}`];
          default:
            return [];
        }
      })
    );

  const builtSolids = (builder: WorldBuilder) =>
    children(builder.floor).map((sprite) => `${sprite.texture.key}@${sprite.x},${sprite.y}`);

  const builtScenery = (builder: WorldBuilder) =>
    children(builder.scenery).map((sprite) => `${sprite.texture?.key ?? sprite.type}@${sprite.x},${sprite.y}`);

  const stoneAt = (stone: StonePiece) => `${stone.key}@${stone.x},${stone.floorY - FLOOR_SURFACE_ABOVE_Y}`;
  const coinAt = (coin: CoinPiece) => `${coin.x},${coin.y}`;

  const liveTweens = () => harness.scene.tweens.getTweens().filter((tween) => !tween.isDestroyed()).length;

  /** A seed whose world has a fishing hut early on, found with the plans alone. */
  const seedWithHut = () => {
    for (let i = 1; i < 500; i++) {
      const seed = (Math.imul(i, 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0');
      const generator = new WorldGenerator({ key: seed, floorY: TEST_FLOOR_Y });
      for (let plan = generator.next(); plan.startX < 16000; plan = generator.next()) {
        if (plan.pattern === 'fishing-hut') return { seed, hutEndX: plan.endX };
      }
    }
    throw new Error('no seed with a fishing hut');
  };

  it('builds every tile, block and platform of its plans, where the plans put them', () => {
    const { builder } = build('A1B2C3D4');

    expect(builder.liveChunks.length).toBeGreaterThan(5);
    expect(builtSolids(builder)).toEqual(plannedSolids(builder.liveChunks));
  });

  it('gives invisible platforms the bodies of their plans, and the fishing hut its picture', () => {
    const { seed, hutEndX } = seedWithHut();
    const { builder } = build(seed, { endX: hutEndX });

    // Two of the hut's platforms share a corner: they are matched in order.
    const platforms: PlatformPiece[] = piecesOf(builder.liveChunks, 'platform');
    const bodies = children(builder.floor)
      .filter((s) => s.texture.key === 'invisBlock')
      .map((s) => (s as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody);
    expect(platforms.length).toBeGreaterThan(0);
    expect(bodies.length).toBe(platforms.length);
    platforms.forEach((platform, i) => {
      const context = `platform ${i} at ${platform.x}`;
      expect(bodies[i].left).withContext(context).toBeCloseTo(platform.x, 5);
      expect(bodies[i].top).withContext(context).toBeCloseTo(platform.y, 5);
      expect(bodies[i].width).withContext(context).toBeCloseTo(platform.width, 5);
      expect(bodies[i].height).withContext(context).toBeCloseTo(platform.height, 5);
    });

    for (const hut of piecesOf(builder.liveChunks, 'hut')) {
      const picture = children(builder.scenery).find((s) => s.name === 'fishing-hut');
      expect(picture).toBeDefined();
      expect(picture?.x).toBe(hut.x);
      expect(picture?.y).toBe(hut.y);
    }
  });

  it('puts the stones, the coins and the bridges of its plans in the world', () => {
    const { builder, pools } = build('A1B2C3D4', { endX: 12000 });
    const plans = builder.liveChunks;

    const stones = piecesOf(plans, 'stone');
    const coins = piecesOf(plans, 'coin');
    const bridges: BridgePiece[] = piecesOf(plans, 'bridge');
    expect(stones.length).toBeGreaterThan(0);
    expect(coins.length).toBeGreaterThan(0);
    expect(bridges.length).toBeGreaterThan(0);

    expect(active(pools.stones.getGroup()).map((s) => `${s.texture.key}@${s.x},${s.y}`)).toEqual(stones.map(stoneAt));
    expect(active(pools.coins.getGroup()).map((c) => `${c.x},${c.y}`)).toEqual(coins.map(coinAt));
    const blocks = bridges.reduce((sum, b) => sum + Math.max(1, Math.ceil((b.endX - b.startX) / TILE.BLOCK_SIZE)), 0);
    expect(pools.bridges.getGroup().getLength()).toBe(blocks);
  });

  it('builds the same world whether the camera crawls or jumps ahead', () => {
    const crawling = build('A1B2C3D4', { stepPx: 7 });
    const jumping = build('A1B2C3D4');

    expect(builtSolids(crawling.builder)).toEqual(builtSolids(jumping.builder));
    expect(builtScenery(crawling.builder)).toEqual(builtScenery(jumping.builder));
  });

  it('leaves nothing to stand on under the hole of a bridge', () => {
    const { builder } = build('A1B2C3D4', { endX: 12000 });

    for (const bridge of piecesOf(builder.liveChunks, 'bridge')) {
      const under = children(builder.floor).filter((sprite) => {
        const body = (sprite as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody;
        return body.right > bridge.startX && body.left < bridge.endX;
      });
      expect(under.map((s) => `${s.texture.key}@${s.x}`)).withContext(`bridge at ${bridge.startX}`).toEqual([]);
    }
  });

  describe('releasing', () => {
    const END_X = 30000;

    it('lets go of the chunks left behind, with everything they placed', () => {
      const { builder, pools } = build('A1B2C3D4', { endX: END_X, stepPx: 64, release: true });
      const live = builder.liveChunks;

      for (const plan of live) {
        expect(plan.endX + TILE.END_WIDTH).toBeGreaterThanOrEqual(END_X - RELEASE_DISTANCE);
      }
      expect(builtSolids(builder)).toEqual(plannedSolids(live));
      expect(active(pools.stones.getGroup()).length).toBe(piecesOf(live, 'stone').length);
      expect(active(pools.coins.getGroup()).length).toBe(piecesOf(live, 'coin').length);
      expect(active(pools.decoration.getGroup()).length).toBe(piecesOf(live, 'deco').length);
      expect(children(builder.scenery).length).toBe(
        live.flatMap((p) => p.pieces).filter((p) => p.type === 'grass' || p.type === 'hut' || p.type === 'water').length
      );

      // Each idle bridge block breathes with one tween of its own.
      const bridgeBlocks = piecesOf(live, 'bridge').reduce(
        (sum, b) => sum + Math.max(1, Math.ceil((b.endX - b.startX) / TILE.BLOCK_SIZE)),
        0
      );
      expect(pools.bridges.getGroup().getLength()).toBe(bridgeBlocks);
      expect(liveTweens()).toBe(bridgeBlocks);
    });

    it('uses the same stones and coins again instead of making new ones', () => {
      const { pools } = build('A1B2C3D4', { endX: END_X, stepPx: 64, release: true });

      const generator = new WorldGenerator({ key: 'A1B2C3D4', floorY: TEST_FLOOR_Y });
      const planned: ChunkPlan[] = [];
      for (let plan = generator.next(); plan.startX < END_X; plan = generator.next()) planned.push(plan);

      const stones = piecesOf(planned, 'stone').length;
      const coins = piecesOf(planned, 'coin').length;
      expect(stones).toBeGreaterThan(3);
      expect(pools.stones.getGroup().getLength()).toBeLessThan(stones);
      expect(pools.coins.getGroup().getLength()).toBeLessThan(coins / 3);
    });

    it('keeps a picked-up coin out of use until its chunk is gone', () => {
      const { builder, pools } = build('A1B2C3D4', { endX: 3000 });
      const coin = active(pools.coins.getGroup())[0] as Phaser.Physics.Arcade.Sprite;
      expect(coin).toBeDefined();

      pools.coins.collectCoin(coin, coin);
      builder.fillAhead(9000);

      expect(coin.active).toBeFalse();
    });
  });
});
