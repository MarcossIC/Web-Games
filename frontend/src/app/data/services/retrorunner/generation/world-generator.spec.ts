import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import SeededRandom from '../utils/SeededRandom';
import { jumpOverHole } from '../testing/stepped-jump';
import {
  ARC,
  COST,
  ELEVATION,
  GAP,
  JUMP_SAFETY,
  LANDING,
  MAX_ATTEMPTS,
  SAFE_START_END_X,
  START_WALLET,
  TAKEOFF,
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
import { ARC_COIN_ABOVE_FEET, ArcJump, arcJump } from './fill';
import { FLOOR_SURFACE_ABOVE_Y, floorRunEnd, HUT, STONE_HIT_HALF_WIDTH, TILE } from './geometry';
import {
  BASE_WALK_SPEED,
  BODY_HEIGHT,
  BODY_WIDTH,
  FULL_HOLD,
  JUMP_APEX,
  jumpApex,
  jumpReach,
  PLANNED_HOLD,
} from './jump-model';
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
/**
 * The share of the planned jump at the speed of its X that the air over a
 * gap takes: its hole less the player's width, which hangs over both edges.
 */
const gapFraction = (gap: ChunkPlan) =>
  (gap.endX - gap.startX - TILE.END_WIDTH - BODY_WIDTH) /
  jumpReach(gap.exitY - gap.entryY, speedMultiplierAt(gap.startX), PLANNED_HOLD);
/** A gap as the jump over it sees it. */
const holeOf = (gap: ChunkPlan) => ({
  takeoffX: gap.startX + TILE.END_WIDTH,
  landingX: gap.endX,
  takeoffTop: gap.entryY - FLOOR_SURFACE_ABOVE_Y,
  landingTop: gap.exitY - FLOOR_SURFACE_ABOVE_Y,
  speedMultiplier: speedMultiplierAt(gap.startX),
});

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
        // The hole is cut to whole pixels: up to one less.
        expect(gapFraction(gap)).withContext(context).toBeGreaterThanOrEqual(GAP.MIN_FRACTION - 0.01);
        expect(gapFraction(gap)).withContext(context).toBeLessThanOrEqual(difficultyAt(gap.startX).maxGapFraction);
      }
    });

    it('ask for up to 85 % of the planned jump in the hardest stretch', () => {
      const hardest = Math.max(...gaps.filter((gap) => gap.startX >= 11000).map(gapFraction));
      expect(hardest).toBeGreaterThan(0.8);
      expect(hardest).toBeLessThanOrEqual(GAP.MAX_FRACTION);
    });

    // A narrow hole down to a lower floor was no hole: the player ran off
    // the edge and the fall alone carried it to the other side.
    it('cannot be crossed by running off the edge, not even one 15 px narrower', () => {
      const open = gaps.filter((gap) => piecesOf(gap, 'bridge').length === 0);
      expect(open.length).toBeGreaterThan(100);
      for (const gap of open) {
        const hole = holeOf(gap);
        const run = jumpOverHole({ ...hole, landingX: hole.landingX - 15, pressAt: Infinity, hold: 0 });
        expect(run.landed).withContext(`gap at ${gap.startX}`).toBeFalse();
      }
    });

    it('still bring the floor down when they are wide enough for it', () => {
      const lowered = gaps.filter((gap) => gap.exitY > gap.entryY);
      expect(lowered.length).toBeGreaterThan(gaps.length / 10);
    });

    // Gaps were measured against a jump twice as long as the one the player
    // had (the physics stepped twice a frame): past the first stretch they
    // took more than the whole jump, or left a frame or two to press it in.
    describe('leave room to press the jump', () => {
      /** The last place the key works: the body about to leave the floor. */
      const lastPress = (gap: ChunkPlan) => holeOf(gap).takeoffX + BODY_WIDTH / 2 - 6;
      /** Whether every gap is crossed with the key held `hold` s, pressed `early` s before that. */
      const crossedBy = (hold: number, early: number) => {
        for (const gap of gaps) {
          const hole = holeOf(gap);
          const pressAt = lastPress(gap) - early * BASE_WALK_SPEED * hole.speedMultiplier;
          const jump = jumpOverHole({ ...hole, pressAt, hold });
          expect(jump.landed).withContext(`gap at ${gap.startX}, held ${hold} s, pressed ${early} s early`).toBeTrue();
        }
      };

      it('a short press makes it from the edge', () => {
        crossedBy(PLANNED_HOLD, 0);
        crossedBy(PLANNED_HOLD, 0.02);
      });

      it('a press of 150 ms has a tenth of a second of floor', () => {
        for (const early of [0, 0.05, 0.1]) crossedBy(0.15, early);
      });

      it('the key held to the end has a fifth of a second of it', () => {
        for (const early of [0, 0.1, 0.2]) crossedBy(FULL_HOLD, early);
      });
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
              (hole - BODY_WIDTH) / jumpReach(plan.exitY - plan.entryY, speedMultiplierAt(plan.startX), PLANNED_HOLD) +
                (bridged ? COST.BRIDGE : 0),
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

    // The platforms of a dual path used to hang 7 to 52 px over the ground:
    // most of them were walls across the path below, and none had a coin.
    describe('a dual path', () => {
      /** Its blocks but the first one, which is the ramp on the ground. */
      const platformBlocks = (plan: ChunkPlan) => piecesOf(plan, 'block').slice(1);

      it('hangs its platforms high enough to run under and low enough to jump onto', () => {
        for (const plan of ofPattern('dual-path')) {
          const surface = plan.entryY - FLOOR_SURFACE_ABOVE_Y;
          const [ramp] = piecesOf(plan, 'block');
          const rampTop = ramp.y - TILE.BLOCK_SIZE / 2;
          for (const block of platformBlocks(plan)) {
            const context = `platform at ${block.x}`;
            const top = block.y - TILE.BLOCK_SIZE / 2;
            expect(surface - (block.y + TILE.BLOCK_SIZE / 2)).withContext(context).toBeGreaterThanOrEqual(BODY_HEIGHT + 6);
            // With the planned jump from the ramp, or the whole jump from the ground.
            expect(rampTop - top).withContext(context).toBeLessThanOrEqual(jumpApex(PLANNED_HOLD) * JUMP_SAFETY);
            expect(surface - top).withContext(context).toBeLessThanOrEqual(JUMP_APEX * JUMP_SAFETY);
          }
        }
      });

      it('puts coins over its platforms', () => {
        let coins = 0;
        for (const plan of ofPattern('dual-path')) {
          for (const coin of piecesOf(plan, 'coin')) {
            coins++;
            const under = platformBlocks(plan).find(
              (block) => coin.x >= block.x && coin.x <= block.x + TILE.BLOCK_SIZE && coin.y < block.y - TILE.BLOCK_SIZE / 2
            );
            expect(under).withContext(`coin at ${coin.x}`).toBeDefined();
          }
        }
        expect(coins).toBeGreaterThan(ofPattern('dual-path').length);
      });
    });
  });

  // A stone under a block cannot be jumped: the head hits the block and the
  // player comes down on the stone.
  describe('stones', () => {
    it('always have open sky over them and to both sides, as wide as the player', () => {
      let stones = 0;
      let sharing = 0;
      for (const plan of manySeeds(100).flatMap((seed) => planWorld(seed))) {
        const blocks = piecesOf(plan, 'block');
        for (const stone of piecesOf(plan, 'stone')) {
          stones++;
          if (blocks.length > 0) sharing++;
          const clear = STONE_HIT_HALF_WIDTH + BODY_WIDTH;
          for (const block of blocks) {
            expect(stone.x <= block.x - clear || stone.x >= block.x + TILE.BLOCK_SIZE + clear)
              .withContext(`stone at ${stone.x}, block at ${block.x}`)
              .toBeTrue();
          }
        }
      }
      expect(stones).toBeGreaterThan(100);
      // Stones do share chunks with blocks: keeping them apart is not how the rule is met.
      expect(sharing).toBeGreaterThan(20);
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

  // The other edge of D-04: a stone could stand 71 px before a hole, so the
  // hop over it came down where the jump over the hole had to start.
  describe('take-offs', () => {
    it('keep every stone a run-up away from where a hole begins', () => {
      let checked = 0;
      for (const world of manySeeds(100).map((seed) => planWorld(seed, 40000))) {
        const stones = world.flatMap((plan) => piecesOf(plan, 'stone'));
        for (const gap of world.filter((plan) => plan.kind === 'gap')) {
          const edge = gap.startX + TILE.END_WIDTH;
          const last = stones.filter((stone) => stone.x < edge).pop();
          if (!last) continue;
          checked++;
          const runUp = TAKEOFF.CLEAR_TIME * BASE_WALK_SPEED * speedMultiplierAt(gap.startX);
          expect(edge - (last.x + STONE_HIT_HALF_WIDTH))
            .withContext(`gap at ${gap.startX}`)
            .toBeGreaterThanOrEqual(runUp);
        }
      }
      expect(checked).toBeGreaterThan(100);
    });
  });

  // D-08 (I-15). The arc drew the whole jump squeezed into the width of the
  // hole: as high as the jump gets, over a hole a tap crosses. Running at
  // the speed of the place, the player was never where the coins were.
  describe('coins over a gap', () => {
    let gaps: ChunkPlan[];
    beforeAll(
      () => (gaps = manySeeds(20).flatMap((seed) => planWorld(seed, 40000)).filter((p) => p.kind === 'gap'))
    );

    /**
     * The jump they draw: pressed with the whole body still on the floor,
     * held just long enough to land with the whole body past the hole.
     */
    const arcOf = (gap: ChunkPlan) => {
      const hole = holeOf(gap);
      const drop = hole.landingTop - hole.takeoffTop;
      const jump = arcJump(hole.takeoffX, hole.landingX, drop, hole.speedMultiplier) as ArcJump;
      return { ...hole, pressAt: jump.pressX, hold: jump.hold, coins: piecesOf(gap, 'coin') };
    };

    it('draw a jump pressed on the floor that lands on the floor', () => {
      for (const gap of gaps) {
        const arc = arcOf(gap);
        const reach = jumpReach(arc.landingTop - arc.takeoffTop, arc.speedMultiplier, arc.hold);
        const context = `gap at ${gap.startX}`;
        // The middle of the body: at most its half past the edge, either way.
        expect(arc.pressAt).withContext(context).toBeLessThanOrEqual(arc.takeoffX - ARC.BEFORE_EDGE + BODY_WIDTH / 2);
        expect(arc.pressAt).withContext(context).toBeGreaterThanOrEqual(arc.takeoffX - ARC.BEFORE_EDGE);
        expect(arc.pressAt + reach).withContext(context).toBeGreaterThan(arc.landingX);
        expect(arc.hold).withContext(context).toBeLessThanOrEqual(FULL_HOLD);
      }
    });
    /** How far above the floor the jump leaves the highest coin floats. */
    const arcHeight = (gap: ChunkPlan) =>
      Math.max(...piecesOf(gap, 'coin').map((coin) => gap.entryY - FLOOR_SURFACE_ABOVE_Y - coin.y));

    it('float over the hole, three or more', () => {
      for (const gap of gaps) {
        const coins = piecesOf(gap, 'coin');
        expect(coins.length).withContext(`gap at ${gap.startX}`).toBeGreaterThanOrEqual(3);
        for (const coin of coins) {
          expect(coin.x).withContext(`coin at ${coin.x}`).toBeGreaterThan(gap.startX + TILE.END_WIDTH);
          expect(coin.x).withContext(`coin at ${coin.x}`).toBeLessThan(gap.endX);
        }
      }
    });

    it('are all picked up by one jump at running speed, which lands past the hole', () => {
      for (const gap of gaps) {
        const arc = arcOf(gap);
        const jump = jumpOverHole(arc);
        expect(jump.landed).withContext(`gap at ${gap.startX}`).toBeTrue();
        expect(jump.coins).withContext(`gap at ${gap.startX}`).toBe(arc.coins.length);
      }
    });

    it('forgive a press a little early or a little late', () => {
      for (const gap of gaps) {
        const arc = arcOf(gap);
        for (const off of [-10, 10]) {
          const jump = jumpOverHole({ ...arc, pressAt: arc.pressAt + off });
          expect(jump.landed).withContext(`gap at ${gap.startX}, ${off} px off`).toBeTrue();
          expect(jump.coins).withContext(`gap at ${gap.startX}, ${off} px off`).toBe(arc.coins.length);
        }
      }
    });

    it('stay low over a narrow hole and climb over a wide one, never past the whole jump', () => {
      const narrow = gaps.filter((gap) => gapFraction(gap) < 0.45);
      const wide = gaps.filter((gap) => gapFraction(gap) > 0.75);
      expect(narrow.length).toBeGreaterThan(0);
      expect(wide.length).toBeGreaterThan(0);
      const highestNarrow = Math.max(...narrow.map(arcHeight));
      const lowestWide = Math.min(...wide.map(arcHeight));
      expect(lowestWide).toBeGreaterThan(highestNarrow);
      for (const gap of gaps) {
        expect(arcHeight(gap)).withContext(`gap at ${gap.startX}`).toBeLessThanOrEqual(JUMP_APEX + ARC_COIN_ABOVE_FEET);
      }
    });
  });
});
