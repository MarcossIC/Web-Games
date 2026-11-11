import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import SeededRandom from '../utils/SeededRandom';
import {
  COST,
  ELEVATION,
  HARD_CHUNK_COST,
  MAX_ATTEMPTS,
  REST_AFTER_HARD_CHUNKS,
  SAFE_START_END_X,
  UNLOCKS,
} from './balance';
import {
  BiomeType,
  BridgePiece,
  ChunkPlan,
  COSMETIC_PIECES,
  DecoPiece,
  FloorPiece,
  HutPiece,
  Piece,
  PlatformPiece,
} from './chunk-plan';
import { biomeAt } from './difficulty-curve';
import { FLOOR_SURFACE_ABOVE_Y, floorRunEnd, HUT, TILE } from './geometry';
import { jumpReach } from './jump-model';
import { validateChunk } from './validate-chunk';
import { firstContext, nextContext, planChunk, WorldGenerator } from './world-generator';

const FLOOR_Y = 314;
/** Far enough to cross every difficulty level and the three biomes. */
const WORLD_END_X = 20000;
const SEEDS = ['A1B2C3D4', '00000001', 'CAFEBABE'];

/** A spread of seeds that look like the ones the game makes. */
const manySeeds = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    (Math.imul(i + 1, 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0')
  );

function planWorld(key: string, endX = WORLD_END_X, cosmeticKey?: string): ChunkPlan[] {
  const generator = new WorldGenerator({ key, floorY: FLOOR_Y, cosmeticKey });
  const plans: ChunkPlan[] = [];
  while (plans.length === 0 || plans[plans.length - 1].endX < endX) plans.push(generator.next());
  return plans;
}

const isCosmetic = (piece: Piece) => COSMETIC_PIECES.includes(piece.type);
const piecesOf = <T extends Piece['type']>(plan: ChunkPlan, type: T) =>
  plan.pieces.filter((piece): piece is Extract<Piece, { type: T }> => piece.type === type);
const floorsOf = (plan: ChunkPlan): FloorPiece[] => piecesOf(plan, 'floor');

/** Left and right of whatever the player can stand on or touch. */
function solidSpan(piece: Piece): [number, number] | null {
  switch (piece.type) {
    case 'floor':
      return [piece.x, floorRunEnd(piece.x, piece.centerTiles) + TILE.END_WIDTH];
    case 'block':
      return [piece.x, piece.x + TILE.BLOCK_SIZE];
    case 'platform':
      return [piece.x, piece.x + piece.width];
    default:
      return null;
  }
}

describe('world generator', () => {
  describe('determinism', () => {
    it('plans the same world every time', () => {
      expect(planWorld('A1B2C3D4')).toEqual(planWorld('A1B2C3D4'));
    });

    it('plans different worlds for different seeds', () => {
      expect(planWorld('A1B2C3D4')).not.toEqual(planWorld('A1B2C3D5'));
    });

    it('plans each chunk from the seed, its index and the chunk before, whatever the order', () => {
      const plans = planWorld('A1B2C3D4', 40000);
      const order = plans.map((_, i) => i);
      const shuffle = new SeededRandom('order');
      for (let i = order.length - 1; i > 0; i--) {
        const j = shuffle.intBetween(0, i);
        [order[i], order[j]] = [order[j], order[i]];
      }

      for (const i of order) {
        const context = i === 0 ? firstContext(FLOOR_Y) : nextContext(plans[i - 1]);
        expect(planChunk({ key: 'A1B2C3D4', floorY: FLOOR_Y }, context))
          .withContext(`chunk ${i}`)
          .toEqual(plans[i]);
      }
    });

    it('keeps everything that plays the same when only the looks change', () => {
      const first = planWorld('A1B2C3D4', WORLD_END_X, 'LOOKS-1');
      const second = planWorld('A1B2C3D4', WORLD_END_X, 'LOOKS-2');

      // The spacing of trees and willows is carried along too, and is looks.
      const solid = (plans: ChunkPlan[]) =>
        plans.map((plan) => ({
          ...plan,
          pieces: plan.pieces.filter((p) => !isCosmetic(p)),
          carry: { hardStreak: plan.carry.hardStreak, lastObstacleX: plan.carry.lastObstacleX },
        }));
      const looks = (plans: ChunkPlan[], type: Piece['type']) =>
        plans.flatMap((plan) => plan.pieces.filter((p) => p.type === type));

      expect(solid(first)).toEqual(solid(second));
      // Each kind of looks follows the cosmetic seed: none of them draws from
      // a stream of the ground's.
      expect(looks(first, 'grass')).not.toEqual(looks(second, 'grass'));
      expect(looks(first, 'deco')).not.toEqual(looks(second, 'deco'));
    });
  });

  describe('every chunk', () => {
    // Validation sends a bad chunk back to be planned again: that is a net
    // for the game, not a way to plan. Every chunk has to come out right the
    // first time, or a rule is broken and the net is hiding it.
    it('continues the one before and can be crossed, at its first attempt, on 1000 seeds', () => {
      const failures: string[] = [];
      let chunks = 0;
      for (const seed of manySeeds(1000)) {
        const plans = planWorld(seed);
        plans.forEach((plan, i) => {
          chunks++;
          const problems = validateChunk(plan, i === 0 ? null : plans[i - 1]);
          if (problems.length > 0) failures.push(`${seed} chunk ${i}: ${problems.join('; ')}`);
          if (plan.attempt > 0) failures.push(`${seed} chunk ${i}: needed attempt ${plan.attempt}`);
        });
      }
      expect(chunks).toBeGreaterThan(30000);
      expect(failures.slice(0, 5)).toEqual([]);
    });

    it('falls back to plain ground at the arrival height when no attempt can be crossed', () => {
      const plans = planWorld('A1B2C3D4', 5000);
      const context = nextContext(plans[plans.length - 1]);
      // Standing far away: nothing in the chunk can be reached.
      const unreachable = { ...context, entrySurface: { left: -2000, right: -1900, top: context.entryY } };

      const plan = planChunk({ key: 'A1B2C3D4', floorY: FLOOR_Y }, unreachable);

      expect(plan.attempt).toBe(MAX_ATTEMPTS);
      expect(plan.kind).toBe('ground');
      expect(plan.pieces.filter((p) => !isCosmetic(p))).toEqual([
        { type: 'floor', x: context.startX, y: context.entryY, centerTiles: 6 },
      ]);
      expect(plan.exitY).toBe(context.entryY);
    });

    it('takes the biome of its own X', () => {
      for (const plan of planWorld('A1B2C3D4')) {
        expect(plan.biome).withContext(`chunk ${plan.index}`).toBe(biomeAt(plan.startX));
      }
    });

    it('starts as plain ground while the player arrives', () => {
      for (const seed of SEEDS) {
        for (const plan of planWorld(seed).filter((p) => p.startX < SAFE_START_END_X)) {
          expect(plan.kind).withContext(`${seed} chunk ${plan.index}`).toBe('ground');
          expect(piecesOf(plan, 'stone')).withContext(`${seed} chunk ${plan.index}`).toEqual([]);
        }
      }
    });
  });

  describe('the floor', () => {
    let plans: ChunkPlan[];
    beforeAll(() => (plans = SEEDS.flatMap((seed) => planWorld(seed))));

    it('starts at its lowest height', () => {
      for (const seed of SEEDS) expect(planWorld(seed)[0].entryY).toBe(FLOOR_Y);
    });

    it('stays between its lowest height and 80 px above it', () => {
      for (const floor of plans.flatMap(floorsOf)) {
        expect(floor.y).toBeLessThanOrEqual(FLOOR_Y);
        expect(floor.y).toBeGreaterThanOrEqual(FLOOR_Y + ELEVATION.MAX);
      }
    });

    // I-09: one sample of noise per segment was as good as a random height.
    it('moves by a bounded step from the floor before', () => {
      for (const plan of plans.filter((p) => p.kind === 'ground')) {
        const [first] = floorsOf(plan);
        expect(Math.abs(first.y - plan.entryY))
          .withContext(`chunk ${plan.index}`)
          .toBeLessThanOrEqual(ELEVATION.STEP);
      }
    });

    it('wanders: plain ground does not sit at one height', () => {
      const heights = new Set(plans.filter((p) => p.kind === 'ground').map((p) => floorsOf(p)[0].y));
      expect(heights.size).toBeGreaterThan(5);
    });
  });

  describe('gaps', () => {
    let gaps: ChunkPlan[];
    beforeAll(() => (gaps = SEEDS.flatMap((seed) => planWorld(seed)).filter((p) => p.kind === 'gap')));

    // I-08: the stepping stones needed a gap wider than any gap asked for.
    it('stay within one jump and need no stepping stones', () => {
      expect(gaps.length).toBeGreaterThan(10);
      for (const gap of gaps) {
        expect(gap.endX - gap.startX).toBeLessThanOrEqual(200);
        expect(piecesOf(gap, 'block')).toEqual([]);
      }
    });

    it('never come two in a row, a fishing hut counting as one', () => {
      for (const seed of SEEDS) {
        const world = planWorld(seed, 40000);
        world.forEach((plan, i) => {
          const isHole = (p: ChunkPlan) => p.kind === 'gap' || p.pattern === 'fishing-hut';
          if (i > 0 && isHole(plan)) {
            expect(isHole(world[i - 1])).withContext(`${seed} chunk ${i}`).toBeFalse();
          }
        });
      }
    });
  });

  describe('bridges', () => {
    let bridges: { world: ChunkPlan[]; i: number; plan: ChunkPlan; bridge: BridgePiece }[];
    beforeAll(() => {
      // The last chunk of a world may be a gap whose landing was not planned.
      bridges = manySeeds(40)
        .map((seed) => planWorld(seed))
        .flatMap((world) =>
          world.flatMap((plan, i) => piecesOf(plan, 'bridge').map((bridge) => ({ world, i, plan, bridge })))
        )
        .filter(({ world, i }) => i + 1 < world.length);
    });

    it('appear once unlocked and never before', () => {
      expect(bridges.length).toBeGreaterThan(10);
      for (const { bridge } of bridges) expect(bridge.startX).toBeGreaterThanOrEqual(UNLOCKS.bridges);
    });

    it('span the hole of a gap, level with both edges', () => {
      for (const { world, i, plan, bridge } of bridges) {
        const context = `bridge at ${bridge.startX}`;
        expect(plan.kind).withContext(context).toBe('gap');
        expect(bridge.startX).withContext(context).toBe(plan.startX + TILE.END_WIDTH);
        expect(bridge.endX).withContext(context).toBe(plan.endX);
        expect(plan.entryY).withContext(context).toBe(bridge.floorY);
        expect(plan.exitY).withContext(context).toBe(bridge.floorY);
        expect(floorsOf(world[i + 1])[0]).withContext(context).toEqual(
          jasmine.objectContaining({ x: plan.endX, y: bridge.floorY })
        );
      }
    });

    it('leave nothing under the hole to land on', () => {
      for (const { world, i, bridge } of bridges) {
        const near = [world[i - 1], world[i], world[i + 1]].flatMap((p) => p.pieces);
        const under = near.filter((piece) => {
          const span = solidSpan(piece);
          return span !== null && span[1] > bridge.startX && span[0] < bridge.endX;
        });
        expect(under).withContext(`bridge at ${bridge.startX}`).toEqual([]);
      }
    });
  });

  describe('cost', () => {
    let plans: ChunkPlan[];
    beforeAll(() => (plans = SEEDS.flatMap((seed) => planWorld(seed))));

    // I-03: the rest zones used to read how hard the curve was, not how hard
    // the chunk turned out.
    it('measures what each chunk holds', () => {
      for (const plan of plans) {
        const context = `chunk ${plan.index} (${plan.kind})`;
        if (plan.kind === 'rest') {
          expect(plan.cost).withContext(context).toBe(0);
        } else if (plan.kind === 'ground') {
          expect(plan.cost).withContext(context).toBe(piecesOf(plan, 'stone').length * COST.STONE);
        } else if (plan.kind === 'gap') {
          const hole = plan.endX - plan.startX - TILE.END_WIDTH;
          const bridged = piecesOf(plan, 'bridge').length > 0;
          expect(plan.cost)
            .withContext(context)
            .toBeCloseTo(hole / jumpReach(plan.exitY - plan.entryY) + (bridged ? COST.BRIDGE : 0), 10);
        }
      }
    });

    it('counts the hard chunks in a row', () => {
      for (const seed of SEEDS) {
        const world = planWorld(seed);
        world.forEach((plan, i) => {
          const before = i === 0 ? 0 : world[i - 1].carry.hardStreak;
          const expected = plan.cost >= HARD_CHUNK_COST ? before + 1 : 0;
          expect(plan.carry.hardStreak).withContext(`${seed} chunk ${i}`).toBe(expected);
        });
      }
    });
  });

  describe('rest zones', () => {
    let worlds: ChunkPlan[][];
    let rests: { world: ChunkPlan[]; i: number; plan: ChunkPlan }[];
    beforeAll(() => {
      worlds = manySeeds(40).map((seed) => planWorld(seed));
      rests = worlds.flatMap((world) =>
        world.map((plan, i) => ({ world, i, plan })).filter(({ plan }) => plan.kind === 'rest')
      );
    });

    it('come only after hard chunks in a row', () => {
      expect(rests.length).toBeGreaterThan(10);
      for (const { world, i } of rests) {
        expect(world[i - 1].carry.hardStreak).toBeGreaterThanOrEqual(REST_AFTER_HARD_CHUNKS);
      }
    });

    it('are a breather, not a third of the world', () => {
      const chunks = worlds.flat().filter((plan) => plan.startX >= SAFE_START_END_X);
      expect(rests.length / chunks.length).toBeLessThan(0.2);
    });

    // I-04: the rest zone used to take stones and collapsing blocks.
    it('carry coins and no hazards', () => {
      for (const { plan } of rests) {
        expect(piecesOf(plan, 'stone')).toEqual([]);
        expect(piecesOf(plan, 'bridge')).toEqual([]);
      }
      expect(rests.some(({ plan }) => piecesOf(plan, 'coin').length > 0)).toBeTrue();
    });
  });

  describe('patterns', () => {
    let plans: ChunkPlan[];
    beforeAll(() => (plans = manySeeds(40).flatMap((seed) => planWorld(seed))));
    const ofPattern = (name: ChunkPlan['pattern']) => plans.filter((p) => p.pattern === name);

    // I-12
    it('dual paths and house scenes appear once unlocked and never before', () => {
      expect(ofPattern('dual-path').length).toBeGreaterThan(0);
      expect(ofPattern('house-scene').length).toBeGreaterThan(0);
      for (const plan of ofPattern('dual-path')) expect(plan.startX).toBeGreaterThanOrEqual(UNLOCKS.dualPath);
      for (const plan of ofPattern('house-scene')) expect(plan.startX).toBeGreaterThanOrEqual(UNLOCKS.houseScene);
    });

    // I-14: the house scene was ten plain tiles, with no house.
    it('a house scene has its house', () => {
      for (const plan of ofPattern('house-scene')) {
        const houses = piecesOf(plan, 'deco').filter((deco: DecoPiece) => deco.key === RetroRunnerMedia.HOUSE);
        expect(houses.length).withContext(`chunk at ${plan.startX}`).toBe(1);
        expect(houses[0].x).toBeGreaterThan(plan.startX);
        expect(houses[0].x).toBeLessThan(plan.endX);
      }
    });

    it('only a dual path takes a stone, and only on its ground path', () => {
      for (const plan of plans.filter((p) => p.kind === 'pattern')) {
        const stones = piecesOf(plan, 'stone');
        if (plan.pattern !== 'dual-path') expect(stones).withContext(plan.pattern ?? '').toEqual([]);
        for (const stone of stones) expect(stone.floorY).toBe(floorsOf(plan)[0].y);
      }
    });

    it('leave each chunk at the height they end on', () => {
      for (const plan of plans.filter((p) => p.kind === 'pattern')) {
        const floors = floorsOf(plan);
        expect(floors[floors.length - 1].y).withContext(plan.pattern ?? '').toBe(plan.exitY);
      }
    });
  });

  describe('fishing huts', () => {
    let huts: { plan: ChunkPlan; hut: HutPiece }[];
    beforeAll(() => {
      huts = manySeeds(30)
        .map((seed) => planWorld(seed, 40000))
        .flatMap((world) => world.filter((plan) => plan.pattern === 'fishing-hut'))
        .map((plan) => ({ plan, hut: piecesOf(plan, 'hut')[0] as HutPiece }));
    });

    const platformsOf = (plan: ChunkPlan): PlatformPiece[] => piecesOf(plan, 'platform');

    it('appear in the dusk, one hut each', () => {
      expect(huts.length).toBeGreaterThan(5);
      for (const { plan } of huts) {
        expect(plan.biome).toBe(BiomeType.DUSK);
        expect(piecesOf(plan, 'hut').length).toBe(1);
      }
    });

    it('stand on the shore: the floor runs unbroken from the chunk before to under the base', () => {
      for (const { plan, hut } of huts) {
        const [shore] = floorsOf(plan);
        expect(shore.x).toBe(plan.startX);
        expect(shore.y).toBe(plan.entryY);
        expect(floorRunEnd(shore.x, shore.centerTiles) + TILE.END_WIDTH).toBeGreaterThanOrEqual(hut.x + HUT.BASE_RIGHT);
        expect(Math.abs(shore.y - FLOOR_SURFACE_ABOVE_Y - (hut.y + HUT.BASE_BOTTOM))).toBeLessThanOrEqual(1);
      }
    });

    it('keep the floor out from under the stilts: they stand in the water', () => {
      for (const { plan, hut } of huts) {
        const under = floorsOf(plan).filter((floor) => {
          const [left, right] = solidSpan(floor) as [number, number];
          return right > hut.x + 94 && left < hut.x + HUT.WIDTH;
        });
        expect(under).withContext(`hut at ${hut.x}`).toEqual([]);
      }
    });

    it('let the player walk on the planks, from the house to the end of the dock', () => {
      for (const { plan, hut } of huts) {
        const deck = platformsOf(plan).find(
          (p) => p.y === hut.y + HUT.DECK_TOP && p.x <= hut.x + HUT.BASE_RIGHT && p.x + p.width >= hut.x + HUT.WIDTH
        );
        expect(deck).withContext(`hut at ${hut.x}`).toBeDefined();
      }
    });

    it('do not let the player walk through the house at floor level', () => {
      for (const { plan, hut } of huts) {
        const walkingHeight = hut.y + HUT.BASE_BOTTOM - 4;
        const wall = platformsOf(plan).find(
          (p) =>
            p.x >= hut.x && p.x <= hut.x + HUT.BASE_RIGHT && p.y <= walkingHeight && p.y + p.height >= walkingHeight
        );
        expect(wall).withContext(`hut at ${hut.x}`).toBeDefined();
      }
    });

    it('leave the landing at the height of the shore', () => {
      for (const { plan } of huts) {
        const floors = floorsOf(plan);
        expect(floors.length).toBe(2);
        expect(floors[1].y).toBe(floors[0].y);
        expect(plan.exitY).toBe(plan.entryY);
      }
    });
  });

  describe('coins', () => {
    it('follow a gap from one edge to the other', () => {
      const gaps = SEEDS.flatMap((seed) => planWorld(seed)).filter((p) => p.kind === 'gap');
      const withCoins = gaps.filter((gap) => piecesOf(gap, 'coin').length > 0);
      expect(withCoins.length).toBeGreaterThan(0);
      for (const gap of withCoins) {
        for (const coin of piecesOf(gap, 'coin')) {
          expect(coin.x).toBeGreaterThan(gap.startX);
          expect(coin.x).toBeLessThan(gap.endX);
          expect(coin.y).toBeLessThan(gap.exitY - FLOOR_SURFACE_ABOVE_Y);
        }
      }
    });
  });
});
