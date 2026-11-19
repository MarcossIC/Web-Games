import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import SeededRandom from '../utils/SeededRandom';
import {
  COST,
  ELEVATION,
  GAP,
  LANDING,
  MAX_ATTEMPTS,
  SAFE_START_END_X,
  START_WALLET,
  TENSION,
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
import { biomeAt, budgetAt, difficultyAt, speedMultiplierAt } from './difficulty-curve';
import { ARC_COIN_ABOVE_FEET } from './fill';
import { FLOOR_SURFACE_ABOVE_Y, floorRunEnd, HUT, STONE_HIT_HALF_WIDTH, TILE } from './geometry';
import { airTime, BASE_WALK_SPEED, jumpHeightAt, jumpReach } from './jump-model';
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
const isHole = (plan: ChunkPlan) => plan.kind === 'gap' || plan.pattern === 'fishing-hut';
/** The share of the jump at the speed of its X that a gap's hole takes. */
const gapFraction = (gap: ChunkPlan) =>
  (gap.endX - gap.startX - TILE.END_WIDTH) / jumpReach(gap.exitY - gap.entryY, speedMultiplierAt(gap.startX));

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
          carry: {
            wallet: plan.carry.wallet,
            tension: plan.carry.tension,
            goal: plan.carry.goal,
            lastObstacleX: plan.carry.lastObstacleX,
          },
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
    beforeAll(
      () => (gaps = manySeeds(40).flatMap((seed) => planWorld(seed, 40000)).filter((p) => p.kind === 'gap'))
    );

    // I-08: the stepping stones needed a gap wider than any gap asked for.
    it('need no stepping stones', () => {
      expect(gaps.length).toBeGreaterThan(100);
      for (const gap of gaps) expect(piecesOf(gap, 'block')).toEqual([]);
    });

    // D-03: a hole measured in pixels got easier as the player sped up.
    it('take a share of the jump at the speed of their X, as much as the curve lets them there', () => {
      for (const gap of gaps) {
        const context = `gap at ${gap.startX}`;
        expect(gapFraction(gap)).withContext(context).toBeGreaterThanOrEqual(GAP.MIN_FRACTION - 0.005);
        expect(gapFraction(gap)).withContext(context).toBeLessThanOrEqual(difficultyAt(gap.startX).maxGapFraction);
      }
    });

    it('ask for up to 85 % of the jump in the hardest stretch', () => {
      const hardest = Math.max(...gaps.filter((gap) => gap.startX >= 11000).map(gapFraction));
      expect(hardest).toBeGreaterThan(0.8);
      expect(hardest).toBeLessThanOrEqual(GAP.MAX_FRACTION);
    });

    it('never come two in a row, a fishing hut counting as one', () => {
      for (const seed of SEEDS) {
        const world = planWorld(seed, 40000);
        world.forEach((plan, i) => {
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
            .toBeCloseTo(
              hole / jumpReach(plan.exitY - plan.entryY, speedMultiplierAt(plan.startX)) + (bridged ? COST.BRIDGE : 0),
              10
            );
        }
      }
    });
  });

  // D-01: the hazards used to be chances drawn one by one, so a stretch
  // could pile them up or have none. Now the curve pays each chunk a budget
  // and the generator saves it up and spends it on what it builds.
  describe('budget', () => {
    let worlds: ChunkPlan[][];
    beforeAll(() => (worlds = manySeeds(100).map((seed) => planWorld(seed, 40000))));

    const averageCost = (fromX: number, toX: number) => {
      const plans = worlds.flat().filter((plan) => plan.startX >= fromX && plan.startX < toX);
      return {
        cost: plans.reduce((sum, plan) => sum + plan.cost, 0) / plans.length,
        budget: plans.reduce((sum, plan) => sum + budgetAt(plan.startX), 0) / plans.length,
      };
    };

    it('saves what the curve pays at its X and pays for what it builds', () => {
      for (const world of worlds.slice(0, 10)) {
        world.forEach((plan, i) => {
          const before = i === 0 ? START_WALLET : world[i - 1].carry.wallet;
          expect(plan.carry.wallet)
            .withContext(`chunk ${i}`)
            .toBeCloseTo(before + budgetAt(plan.startX) - plan.cost, 9);
        });
      }
    });

    it('spends about what the curve pays, stretch by stretch', () => {
      for (const [fromX, toX] of [
        [4000, 11000],
        [11000, 20000],
        [20000, 40000],
      ]) {
        const { cost, budget } = averageCost(fromX, toX);
        expect(cost / budget).withContext(`${fromX} to ${toX}`).toBeGreaterThan(0.8);
        expect(cost / budget).withContext(`${fromX} to ${toX}`).toBeLessThan(1.2);
      }
    });

    // D-05: measured before the change, a chunk cost 0.22 on average from
    // x = 11000 to x = 40000, with no change at all.
    it('keeps getting harder after x = 11000', () => {
      expect(averageCost(30000, 40000).cost).toBeGreaterThan(averageCost(11000, 15000).cost * 1.2);
    });
  });

  describe('rest zones', () => {
    let worlds: ChunkPlan[][];
    let rests: { world: ChunkPlan[]; i: number; plan: ChunkPlan }[];
    beforeAll(() => {
      // Rests come once the chunks get costly, past x = 11000.
      worlds = manySeeds(40).map((seed) => planWorld(seed, 40000));
      rests = worlds.flatMap((world) =>
        world.map((plan, i) => ({ world, i, plan })).filter(({ plan }) => plan.kind === 'rest')
      );
    });

    // D-02: a wave over X and a coin toss decided the breathers, not how
    // hard the chunks before them had been.
    it('build up tension with the cost of each chunk, which fades, and a rest clears it', () => {
      for (const world of worlds.slice(0, 10)) {
        world.forEach((plan, i) => {
          const before = i === 0 ? 0 : world[i - 1].carry.tension;
          const expected = plan.kind === 'rest' ? 0 : before * TENSION.DECAY + plan.cost;
          expect(plan.carry.tension).withContext(`chunk ${i}`).toBeCloseTo(expected, 9);
        });
      }
    });

    it('come exactly when the tension passes its threshold', () => {
      expect(rests.length).toBeGreaterThan(10);
      for (const world of worlds) {
        world.forEach((plan, i) => {
          if (i === 0 || plan.startX < SAFE_START_END_X) return;
          const tense = world[i - 1].carry.tension >= TENSION.REST_AT;
          expect(plan.kind === 'rest').withContext(`chunk ${i} at ${plan.startX}`).toBe(tense);
        });
      }
    });

    // A ground chunk the budget did not pay for has no stone: for the player
    // it is a breather too, and the one that never runs out.
    it('leave a quarter of the chunks free of hazards, however far the run goes', () => {
      for (const [fromX, toX] of [
        [SAFE_START_END_X, 11000],
        [11000, 20000],
        [20000, 40000],
      ]) {
        const chunks = worlds.flat().filter((plan) => plan.startX >= fromX && plan.startX < toX);
        const calm = chunks.filter((plan) => plan.cost === 0);
        expect(calm.length / chunks.length).withContext(`${fromX} to ${toX}`).toBeGreaterThan(0.2);
      }
    });

    it('are a breather, not a third of the world', () => {
      const chunks = worlds.flat().filter((plan) => plan.startX >= SAFE_START_END_X);
      expect(rests.length / chunks.length).toBeGreaterThan(0.03);
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

  // D-04: a stone could stand 51 px past a landing, less than the player
  // covers before reacting to it.
  describe('landings', () => {
    it('keep every stone a reaction time away from where a hole ends', () => {
      let checked = 0;
      for (const world of manySeeds(100).map((seed) => planWorld(seed, 40000))) {
        world.forEach((plan, i) => {
          if (i === 0 || !isHole(world[i - 1])) return;
          const clear = LANDING.REACTION_TIME * BASE_WALK_SPEED * speedMultiplierAt(plan.startX);
          for (const stone of piecesOf(plan, 'stone')) {
            checked++;
            expect(stone.x - STONE_HIT_HALF_WIDTH - plan.startX)
              .withContext(`stone at ${stone.x}`)
              .toBeGreaterThanOrEqual(clear);
          }
        });
      }
      expect(checked).toBeGreaterThan(0);
    });
  });

  // D-08 (I-15): the arc drew the rise of a jump with one gravity, from the
  // landing's height, and cut it at 110 px.
  describe('coins over a gap', () => {
    let gaps: ChunkPlan[];
    beforeAll(
      () => (gaps = manySeeds(20).flatMap((seed) => planWorld(seed, 40000)).filter((p) => p.kind === 'gap'))
    );

    it('lie on the real jump that leaves one edge and lands on the other', () => {
      for (const gap of gaps) {
        const takeoffX = gap.startX + TILE.END_WIDTH;
        const takeoffTop = gap.entryY - FLOOR_SURFACE_ABOVE_Y;
        const time = airTime(gap.exitY - gap.entryY) as number;
        const speed = (gap.endX - takeoffX) / time;
        const coins = piecesOf(gap, 'coin');
        expect(coins.length).withContext(`gap at ${gap.startX}`).toBeGreaterThanOrEqual(3);
        for (const coin of coins) {
          const t = (coin.x - takeoffX) / speed;
          expect(t).toBeGreaterThan(0);
          expect(t).toBeLessThan(time);
          expect(coin.y)
            .withContext(`coin at ${coin.x}`)
            .toBeCloseTo(takeoffTop - jumpHeightAt(t) - ARC_COIN_ABOVE_FEET, 6);
        }
      }
    });

    it('rise as high as the jump does', () => {
      const highest = Math.max(
        ...gaps.flatMap((gap) => piecesOf(gap, 'coin').map((coin) => gap.entryY - FLOOR_SURFACE_ABOVE_Y - coin.y))
      );
      expect(highest).toBeGreaterThan(150);
    });
  });
});
