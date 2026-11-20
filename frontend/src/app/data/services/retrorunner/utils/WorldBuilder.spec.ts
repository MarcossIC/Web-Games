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
type StaticBody = Phaser.Physics.Arcade.StaticBody;

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
        builder.pictures.getGroup(),
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
   * world is filled ahead of it and, if asked, released behind it. `onStep`
   * looks at the world after each step.
   */
  const build = (
    seed: string,
    options: { endX?: number; stepPx?: number; release?: boolean; onStep?: (x: number, world: World) => void } = {}
  ) => {
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
    const world = { builder, pools };
    worlds.push(world);

    const advance = (x: number) => {
      builder.fillAhead(x);
      if (options.release) builder.releaseBehind(x);
      options.onStep?.(x, world);
    };
    for (let x = 0; x < endX; x += step) advance(x);
    advance(endX);
    return world;
  };

  const children = (group: Phaser.GameObjects.Group) => group.getChildren() as Sprite[];
  const active = (group: Phaser.GameObjects.Group) => children(group).filter((child) => child.active);
  const piecesOf = <T extends Piece['type']>(plans: readonly ChunkPlan[], type: T) =>
    plans.flatMap((plan) => plan.pieces.filter((p): p is Extract<Piece, { type: T }> => p.type === type));

  const rect = (left: number, top: number, width: number, height: number) => `${left},${top} ${width}x${height}`;

  /**
   * The bodies the plans ask for: one for each run of floor, from the left
   * edge of its first tile to the right edge of its last, as tall as the
   * tiles; one for each block and one for each platform.
   */
  const plannedBodies = (plans: readonly ChunkPlan[]) =>
    plans
      .flatMap((plan) =>
        plan.pieces.flatMap((piece) => {
          switch (piece.type) {
            case 'floor': {
              const right = floorRunEnd(piece.x, piece.centerTiles) + TILE.END_WIDTH;
              return [rect(piece.x, piece.y - TILE.FLOOR_HEIGHT / 2, right - piece.x, TILE.FLOOR_HEIGHT)];
            }
            case 'block':
              return [rect(piece.x, piece.y - TILE.BLOCK_SIZE / 2, TILE.BLOCK_SIZE, TILE.BLOCK_SIZE)];
            case 'platform':
              return [rect(piece.x, piece.y, piece.width, piece.height)];
            default:
              return [];
          }
        })
      )
      .sort();

  const builtBodies = (builder: WorldBuilder) =>
    active(builder.floor)
      .map((sprite) => {
        const body = (sprite as Phaser.Physics.Arcade.Sprite).body as StaticBody;
        return rect(body.left, body.top, body.width, body.height);
      })
      .sort();

  /** The tiles, blocks and grass the plans ask for, in the order they are built. */
  const plannedPictures = (plans: readonly ChunkPlan[]) =>
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
          case 'grass':
            return [`${piece.key}@${piece.x},${piece.y}`];
          default:
            return [];
        }
      })
    );

  /** The pictures in the world, in the order the next frame draws them. */
  const drawnPictures = (builder: WorldBuilder) => {
    harness.scene.sys.depthSort();
    const pictures = new Set(active(builder.pictures.getGroup()));
    return (harness.scene.children.list as Sprite[])
      .filter((child) => pictures.has(child))
      .map((picture) => `${picture.texture.key}@${picture.x},${picture.y}`);
  };

  const builtScenery = (builder: WorldBuilder) =>
    children(builder.scenery).map((sprite) => `${sprite.texture?.key ?? sprite.type}@${sprite.x},${sprite.y}`);

  const bridgeBlocks = (plans: readonly ChunkPlan[]) =>
    piecesOf(plans, 'bridge').reduce((sum, b) => sum + Math.max(1, Math.ceil((b.endX - b.startX) / TILE.BLOCK_SIZE)), 0);

  const stoneAt = (stone: StonePiece) => `${stone.key}@${stone.x},${stone.floorY - FLOOR_SURFACE_ABOVE_Y}`;
  const coinAt = (coin: CoinPiece) => `${coin.x},${coin.y}`;

  const liveTweens = () => harness.scene.tweens.getTweens().filter((tween) => !tween.isDestroyed()).length;

  const enabledStaticBodies = () => {
    let count = 0;
    harness.scene.physics.world.staticBodies.forEach((body) => {
      if (body.enable) count++;
    });
    return count;
  };

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

  it('measures the floor tiles as their pictures are', () => {
    const sizes: [RetroRunnerMedia, number][] = [
      [RetroRunnerMedia.FLOORGRASS_START, TILE.START_WIDTH],
      [RetroRunnerMedia.FLOORGRASS_CENTER, TILE.CENTER_WIDTH],
      [RetroRunnerMedia.FLOORGRASS_END, TILE.END_WIDTH],
    ];
    for (const [key, width] of sizes) {
      const frame = harness.scene.textures.getFrame(key);
      expect(frame.width).withContext(key).toBe(width);
      expect(frame.height).withContext(key).toBe(TILE.FLOOR_HEIGHT);
    }
  });

  it('stands each run of floor on a single body, and each block and platform on its own', () => {
    const { builder } = build('A1B2C3D4');

    expect(builder.liveChunks.length).toBeGreaterThan(5);
    expect(builtBodies(builder)).toEqual(plannedBodies(builder.liveChunks));
  });

  it('draws the tiles, blocks and grass of its plans, each over what was built before it', () => {
    const { builder } = build('A1B2C3D4');

    expect(drawnPictures(builder)).toEqual(plannedPictures(builder.liveChunks));
  });

  it('draws pictures with no bodies: only the invisible ones are stood on', () => {
    const { builder } = build('A1B2C3D4');

    for (const picture of active(builder.pictures.getGroup())) expect(picture.body).toBeFalsy();
    for (const body of active(builder.floor)) expect(body.visible).toBeFalse();
  });

  it('gives invisible platforms the bodies of their plans, and the fishing hut its picture', () => {
    const { seed, hutEndX } = seedWithHut();
    const { builder } = build(seed, { endX: hutEndX });

    const platforms: PlatformPiece[] = piecesOf(builder.liveChunks, 'platform');
    expect(platforms.length).toBeGreaterThan(0);
    const bodies = builtBodies(builder);
    for (const platform of platforms) {
      expect(bodies).toContain(rect(platform.x, platform.y, platform.width, platform.height));
    }

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
    expect(active(pools.bridges.getGroup()).length).toBe(bridgeBlocks(plans));
  });

  it('builds the same world whether the camera crawls or jumps ahead', () => {
    const crawling = build('A1B2C3D4', { stepPx: 7 });
    const jumping = build('A1B2C3D4');

    expect(builtBodies(crawling.builder)).toEqual(builtBodies(jumping.builder));
    expect(drawnPictures(crawling.builder)).toEqual(drawnPictures(jumping.builder));
    expect(builtScenery(crawling.builder)).toEqual(builtScenery(jumping.builder));
  });

  it('leaves nothing to stand on under the hole of a bridge', () => {
    const { builder } = build('A1B2C3D4', { endX: 12000 });

    for (const bridge of piecesOf(builder.liveChunks, 'bridge')) {
      const under = active(builder.floor).filter((sprite) => {
        const body = (sprite as Phaser.Physics.Arcade.Sprite).body as StaticBody;
        return body.right > bridge.startX && body.left < bridge.endX;
      });
      expect(under.map((s) => `${s.x}`)).withContext(`bridge at ${bridge.startX}`).toEqual([]);
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
      expect(builtBodies(builder)).toEqual(plannedBodies(live));
      expect(drawnPictures(builder)).toEqual(plannedPictures(live));
      expect(active(pools.stones.getGroup()).length).toBe(piecesOf(live, 'stone').length);
      expect(active(pools.coins.getGroup()).length).toBe(piecesOf(live, 'coin').length);
      expect(active(pools.decoration.getGroup()).length).toBe(piecesOf(live, 'deco').length);
      expect(children(builder.scenery).length).toBe(
        live.flatMap((p) => p.pieces).filter((p) => p.type === 'hut' || p.type === 'water').length
      );
      expect(active(pools.bridges.getGroup()).length).toBe(bridgeBlocks(live));
    });

    it('holds only the bodies its live chunks need, and no tweens, however far the run goes', () => {
      const checked: number[] = [];
      let nextCheck = 0;
      build('A1B2C3D4', {
        endX: 40000,
        stepPx: 64,
        release: true,
        onStep: (x, { builder, pools }) => {
          if (x < nextCheck) return;
          nextCheck += 5000;
          const live = builder.liveChunks;
          const needed = plannedBodies(live).length + bridgeBlocks(live) + active(pools.stones.getGroup()).length;
          expect(enabledStaticBodies()).withContext(`at x = ${x}`).toBe(needed);
          // Idle bridge blocks breathe without tweens of their own.
          expect(liveTweens()).withContext(`at x = ${x}`).toBe(0);
          checked.push(x);
        },
      });

      expect(checked.length).toBe(9);
      expect(checked[checked.length - 1]).toBe(40000);
    });

    it('uses the same tiles, grass, bodies, bridge blocks, stones and coins again instead of making new ones', () => {
      // Everything that was ever in the world: a destroyed object leaves its
      // group, so the groups alone would not tell.
      const seen = {
        pictures: new Set<unknown>(),
        bodies: new Set<unknown>(),
        bridgeBlocks: new Set<unknown>(),
      };
      const { pools } = build('A1B2C3D4', {
        endX: END_X,
        stepPx: 64,
        release: true,
        onStep: (_x, { builder, pools }) => {
          for (const picture of children(builder.pictures.getGroup())) seen.pictures.add(picture);
          for (const body of children(builder.floor)) seen.bodies.add(body);
          for (const block of children(pools.bridges.getGroup())) seen.bridgeBlocks.add(block);
        },
      });

      const generator = new WorldGenerator({ key: 'A1B2C3D4', floorY: TEST_FLOOR_Y });
      const planned: ChunkPlan[] = [];
      for (let plan = generator.next(); plan.startX < END_X; plan = generator.next()) planned.push(plan);

      const stones = piecesOf(planned, 'stone').length;
      const coins = piecesOf(planned, 'coin').length;
      expect(stones).toBeGreaterThan(3);
      expect(bridgeBlocks(planned)).toBeGreaterThan(8);
      expect(pools.stones.getGroup().getLength()).toBeLessThan(stones);
      expect(pools.coins.getGroup().getLength()).toBeLessThan(coins / 3);
      expect(seen.pictures.size).toBeLessThan(plannedPictures(planned).length / 3);
      expect(seen.bodies.size).toBeLessThan(plannedBodies(planned).length / 3);
      // Bridges are rare: only some of their blocks come back before the next one.
      expect(seen.bridgeBlocks.size).toBeLessThan(bridgeBlocks(planned));
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
