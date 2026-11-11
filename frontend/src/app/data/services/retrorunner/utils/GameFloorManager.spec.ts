import * as Phaser from 'phaser';
import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { startTestScene, TestScene, TEST_FLOOR_Y } from '../testing/phaser-test-scene';
import DifficultyManager from './DifficultyManager';
import GameFloorManager, { BridgeInfo, SegmentInfo, WorldCallbacks } from './GameFloorManager';
import SeededRandom from './SeededRandom';

/** Far enough to cross every difficulty level and the three biomes. */
const WORLD_END_X = 20000;
const FLOOR_END_TILE_WIDTH = 15;

interface BuiltWorld {
  manager: GameFloorManager;
  segments: SegmentInfo[];
  bridges: BridgeInfo[];
}

describe('GameFloorManager', () => {
  let harness: TestScene;
  let built: GameFloorManager[] = [];

  beforeAll(async () => {
    harness = await startTestScene();
  });

  afterAll(() => harness?.destroy());

  afterEach(() => {
    for (const manager of built) {
      manager.floor.clear(true, true);
      manager.grassGroup.clear(true, true);
    }
    built = [];
  });

  /**
   * Builds a world the way GameScene does: the camera moves forward and
   * the floor is asked to fill what lies ahead of it.
   */
  const buildWorld = (seed: string, options: { stepPx?: number; grassSeed?: string } = {}): BuiltWorld => {
    const master = new SeededRandom(seed);
    const grass = new SeededRandom(options.grassSeed ?? seed);
    const manager = new GameFloorManager(
      harness.scene,
      new DifficultyManager(),
      master.fork('terrain'),
      grass.fork('grass')
    );
    built.push(manager);

    const segments: SegmentInfo[] = [];
    const bridges: BridgeInfo[] = [];
    const callbacks: WorldCallbacks = {
      onSegmentCreated: (segment) => segments.push(segment),
      onBridgeCreated: (bridge) => bridges.push(bridge),
    };

    manager.createInitialWorld(TEST_FLOOR_Y);
    const step = options.stepPx ?? WORLD_END_X;
    for (let x = 0; x < WORLD_END_X; x += step) manager.generateAhead(x, callbacks);
    manager.generateAhead(WORLD_END_X, callbacks);

    return { manager, segments, bridges };
  };

  const spritesOf = (group: Phaser.GameObjects.Group) =>
    group.getChildren().map((child) => child as Phaser.GameObjects.Sprite);

  const floorOf = (world: BuiltWorld) =>
    spritesOf(world.manager.floor).map((s) => `${s.texture.key}@${s.x},${s.y}`);

  /** Grass, plus the fishing hut and its water, which share the group. */
  const grassOf = (world: BuiltWorld) =>
    spritesOf(world.manager.grassGroup).map((s) => `${s.texture?.key ?? s.type}@${s.x},${s.y}`);

  describe('determinism', () => {
    it('builds the same world whether the camera crawls or jumps ahead', () => {
      const crawling = buildWorld('A1B2C3D4', { stepPx: 7 });
      const jumping = buildWorld('A1B2C3D4');

      expect(floorOf(crawling)).toEqual(floorOf(jumping));
      expect(grassOf(crawling)).toEqual(grassOf(jumping));
      expect(crawling.segments).toEqual(jumping.segments);
    });

    it('gives each chunk the difficulty of its own position', () => {
      const world = buildWorld('A1B2C3D4', { stepPx: 300 });
      const curve = new DifficultyManager();

      expect(world.segments.length).toBeGreaterThan(20);
      for (const segment of world.segments) {
        expect(segment.difficulty).toEqual(curve.getConfig(segment.startX));
      }
    });

    it('keeps the terrain when only the grass changes', () => {
      const first = buildWorld('A1B2C3D4', { grassSeed: 'GRASS-1' });
      const second = buildWorld('A1B2C3D4', { grassSeed: 'GRASS-2' });

      expect(floorOf(first)).toEqual(floorOf(second));
      expect(grassOf(first)).not.toEqual(grassOf(second));
    });
  });

  describe('rest zones', () => {
    it('reports every rest zone as a rest segment', () => {
      const restZones = spyOn<any>(GameFloorManager.prototype, 'generateRestZone').and.callThrough();

      const world = buildWorld('A1B2C3D4');

      expect(restZones.calls.count()).toBeGreaterThan(0);
      expect(world.segments.filter((s) => s.kind === 'rest').length).toBe(restZones.calls.count());
    });
  });

  describe('bridges', () => {
    const SEEDS = ['A1B2C3D4', '00000001', 'CAFEBABE'];

    const allBridges = () =>
      SEEDS.map((seed) => buildWorld(seed)).flatMap((world) =>
        world.bridges.map((bridge) => ({ world, bridge }))
      );

    const floorBodies = (world: BuiltWorld) =>
      spritesOf(world.manager.floor).map((s) => ({
        key: s.texture.key,
        x: s.x,
        y: s.y,
        body: s.body as Phaser.Physics.Arcade.StaticBody,
      }));

    it('appear once the stones do', () => {
      expect(allBridges().length).toBeGreaterThan(0);
    });

    it('span a hole between two edges at the same height', () => {
      for (const { world, bridge } of allBridges()) {
        const tiles = floorBodies(world);
        const leftEdge = tiles.find(
          (t) => t.key === RetroRunnerMedia.FLOORGRASS_END && t.x + FLOOR_END_TILE_WIDTH === bridge.startX
        );
        const rightEdge = tiles.find(
          (t) => t.key === RetroRunnerMedia.FLOORGRASS_START && t.x === bridge.endX
        );

        expect(leftEdge).withContext(`left edge of bridge at ${bridge.startX}`).toBeDefined();
        expect(rightEdge).withContext(`right edge of bridge at ${bridge.startX}`).toBeDefined();
        expect(leftEdge?.y).toBe(bridge.floorY);
        expect(rightEdge?.y).toBe(bridge.floorY);
      }
    });

    it('leave nothing under the hole to land on', () => {
      for (const { world, bridge } of allBridges()) {
        const under = floorBodies(world).filter(
          (t) => t.body.right > bridge.startX && t.body.left < bridge.endX
        );
        expect(under.map((t) => `${t.key}@${t.x},${t.y}`))
          .withContext(`under the bridge at ${bridge.startX}`)
          .toEqual([]);
      }
    });
  });
});
