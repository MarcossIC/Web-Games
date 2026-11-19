import SeededRandom from '../utils/SeededRandom';
import {
  BRIDGE_SHARE,
  COST,
  ELEVATION,
  FIRST_GAP_INDEX,
  GAP,
  GOAL_WEIGHTS,
  HUT_CHANCE,
  HUT_MAX_ELEVATION,
  LANDING,
  MAX_ATTEMPTS,
  REST_COIN_CHANCE,
  SAFE_START_END_X,
  START_WALLET,
  TENSION,
} from './balance';
import { ChunkDraft, ChunkStreams } from './chunk-draft';
import { BiomeType, ChunkContext, ChunkKind, ChunkPlan, Goal, PatternName } from './chunk-plan';
import { biomeAt, budgetAt, difficultyAt, isUnlocked, speedMultiplierAt } from './difficulty-curve';
import { planArcCoins } from './fill';
import { FLOOR_SURFACE_ABOVE_Y, TILE } from './geometry';
import { BASE_WALK_SPEED, jumpReach } from './jump-model';
import { availablePatterns, PATTERNS } from './patterns';
import { checkChunk, entrySurfaceAfter } from './validate-chunk';

/** What a world depends on. */
export interface WorldSeed {
  /** The seed the player shares. */
  key: string;
  /** The centre of the floor tiles at the floor's lowest height. */
  floorY: number;
  /** Seeds the grass and the decoration only. Defaults to `key`. */
  cosmeticKey?: string;
}

/** The context of the first chunk: the player drops onto it at X 0. */
export function firstContext(floorY: number): ChunkContext {
  return {
    index: 0,
    startX: 0,
    entryY: floorY,
    previousKind: null,
    previousPattern: null,
    entrySurface: entrySurfaceAfter(null, 0, floorY),
    carry: { wallet: START_WALLET, goal: null, tension: 0, lastObstacleX: 0, lastTreeX: 0, lastLargeDecoX: 0 },
  };
}

/** The context of the chunk after `plan`: all it inherits from it. */
export function nextContext(plan: ChunkPlan): ChunkContext {
  return {
    index: plan.index + 1,
    startX: plan.endX,
    entryY: plan.exitY,
    previousKind: plan.kind,
    previousPattern: plan.pattern,
    entrySurface: entrySurfaceAfter(plan, plan.endX, plan.exitY),
    carry: { ...plan.carry },
  };
}

/**
 * One stream per decision for each chunk and attempt, so that an extra
 * draw in one never moves another, and a chunk never depends on when it
 * was asked for.
 */
function streamsFor(seed: WorldSeed, index: number, attempt: number): ChunkStreams {
  const chunk = attempt === 0 ? `chunk:${index}` : `chunk:${index}:${attempt}`;
  const looks = seed.cosmeticKey ?? seed.key;
  return {
    terrain: new SeededRandom(`${seed.key}:${chunk}:terrain`),
    obstacles: new SeededRandom(`${seed.key}:${chunk}:obstacles`),
    coins: new SeededRandom(`${seed.key}:${chunk}:coins`),
    decoration: new SeededRandom(`${looks}:${chunk}:decoration`),
    grass: new SeededRandom(`${looks}:${chunk}:grass`),
    budget: new SeededRandom(`${seed.key}:${chunk}:budget`),
  };
}

interface Shape {
  kind: ChunkKind;
  pattern: PatternName | null;
  exitY: number;
  cost: number;
}

function stoneCost(draft: ChunkDraft): number {
  return draft.pieces.filter((piece) => piece.type === 'stone').length * COST.STONE;
}

/**
 * Plain ground, a bounded step up or down from the floor before.
 * @param arriving - the player just arrived: nothing to pick up or avoid
 * @param stone - the budget pays for a stone on it
 */
function planGround(draft: ChunkDraft, { arriving = false, stone = false } = {}): Shape {
  const { terrain } = draft.rng;
  const d = draft.difficulty;

  let y = draft.entryY;
  if (!draft.mustStartLevel) {
    const step = terrain.intBetween(-ELEVATION.STEP, ELEVATION.STEP);
    const elevation = Math.min(0, Math.max(ELEVATION.MAX_GROUND, draft.entryElevation + step));
    y = draft.floorY + elevation;
  }

  const centerTiles = terrain.intBetween(d.minCenterTiles, d.maxCenterTiles);
  const floor = draft.ground(centerTiles, y);

  // A block high over long floors, clear of the decoration.
  if (centerTiles >= 6 && terrain.chance(0.25)) {
    const x = floor.startX + terrain.intBetween(1, Math.floor((floor.endX - floor.startX) * 0.4)) + 80;
    draft.block(x, y - terrain.intBetween(75, 95));
  }

  draft.decoration(floor.startX, floor.endX, y);
  if (!arriving) {
    draft.coins(floor.startX, floor.endX, y, d.coinChance);
    if (stone) draft.stone(floor.startX, floor.endX, y, 1);
  }
  return { kind: 'ground', pattern: null, exitY: y, cost: stoneCost(draft) };
}

/** A long flat breather a little lower down: coins, no hazards. */
function planRest(draft: ChunkDraft): Shape {
  const y = draft.mustStartLevel
    ? draft.entryY
    : draft.floorY + Math.min(0, draft.entryElevation + ELEVATION.RETURN);
  const floor = draft.ground(draft.rng.terrain.intBetween(8, 12), y);
  draft.coins(floor.startX, floor.endX, y, REST_COIN_CHANCE);
  draft.decoration(floor.startX, floor.endX, y);
  return { kind: 'rest', pattern: null, exitY: y, cost: 0 };
}

/**
 * A hole up to the next chunk, which starts with the landing. Its width is
 * a share of the jump at the speed of this X (D-03). An open hole brings
 * the floor down; one with a bridge keeps both edges level.
 */
function planGap(draft: ChunkDraft, goal: Extract<Goal, { kind: 'gap' }>): Shape {
  const exitY = goal.bridged ? draft.entryY : draft.floorY + Math.min(0, draft.entryElevation + ELEVATION.RETURN);
  const reach = jumpReach(exitY - draft.entryY, speedMultiplierAt(draft.startX));
  const hole = Math.floor(goal.fraction * reach);
  const takeoffX = draft.startX + TILE.END_WIDTH;
  const endX = takeoffX + hole;

  if (goal.bridged) {
    draft.add({ type: 'bridge', startX: takeoffX, endX, floorY: draft.entryY });
  }
  draft.add(
    ...planArcCoins(takeoffX, endX, draft.entryY - FLOOR_SURFACE_ABOVE_Y, exitY - FLOOR_SURFACE_ABOVE_Y)
  );
  draft.x = endX;

  return { kind: 'gap', pattern: null, exitY, cost: hole / reach + (goal.bridged ? COST.BRIDGE : 0) };
}

function planPattern(draft: ChunkDraft, pattern: PatternName): Shape {
  const result = PATTERNS[pattern](draft);
  return {
    kind: 'pattern',
    pattern,
    exitY: result.exitY,
    cost: result.cost ?? COST.PATTERN + stoneCost(draft),
  };
}

/** What a goal takes to buy. */
function priceOf(goal: Goal): number {
  switch (goal.kind) {
    case 'gap':
      return goal.fraction + (goal.bridged ? COST.BRIDGE : 0);
    case 'pattern':
      return COST.PATTERN;
    case 'stone':
      return COST.STONE;
  }
}

/** The next thing to save up for, drawn by weight (D-01). */
function pickGoal(draft: ChunkDraft): Goal {
  const { budget } = draft.rng;
  const total = GOAL_WEIGHTS.gap + GOAL_WEIGHTS.pattern + GOAL_WEIGHTS.stone;
  const roll = budget.next() * total;
  const fraction = budget.range(draft.difficulty.minGapFraction, draft.difficulty.maxGapFraction);
  const bridged = isUnlocked('bridges', draft.startX) && budget.chance(BRIDGE_SHARE);

  if (roll < GOAL_WEIGHTS.gap) return { kind: 'gap', fraction, bridged };
  if (roll < GOAL_WEIGHTS.gap + GOAL_WEIGHTS.pattern) return { kind: 'pattern' };
  return { kind: 'stone' };
}

/**
 * Builds what the wallet was saved for, if it fits here.
 * @returns null when it cannot go in this chunk: the goal waits
 */
function buyGoal(draft: ChunkDraft, context: ChunkContext, goal: Goal): { shape: Shape; bought: boolean } | null {
  const { terrain } = draft.rng;
  switch (goal.kind) {
    case 'gap': {
      const afterHole = context.previousKind === 'gap' || context.previousPattern === 'fishing-hut';
      if (context.index < FIRST_GAP_INDEX || afterHole) return null;
      if (
        draft.biome === BiomeType.DUSK &&
        draft.entryElevation > HUT_MAX_ELEVATION &&
        terrain.chance(HUT_CHANCE)
      ) {
        return { shape: planPattern(draft, 'fishing-hut'), bought: true };
      }
      return { shape: planGap(draft, goal), bought: true };
    }
    case 'pattern':
      if (draft.entryElevation <= ELEVATION.MAX) return null;
      return { shape: planPattern(draft, terrain.pick(availablePatterns(draft))), bought: true };
    case 'stone': {
      // The stone may not fit: too close to another one, or to a landing.
      const shape = planGround(draft, { stone: true });
      return { shape, bought: shape.cost > 0 };
    }
  }
}

/**
 * Decides what the chunk is: a rest when the tension is high (D-02), the
 * goal once the wallet can pay for it (D-01), plain ground otherwise.
 */
function shapeChunk(draft: ChunkDraft, context: ChunkContext): Shape {
  if (draft.startX < SAFE_START_END_X) return planGround(draft, { arriving: true });
  if (context.carry.tension >= TENSION.REST_AT) return planRest(draft);

  const goal = draft.carry.goal;
  if (goal && draft.carry.wallet >= priceOf(goal)) {
    const bought = buyGoal(draft, context, goal);
    if (bought) {
      if (bought.bought) draft.carry.goal = null;
      return bought.shape;
    }
  }
  return planGround(draft);
}

function draftChunk(seed: WorldSeed, context: ChunkContext, attempt: number, fallback: boolean): ChunkPlan {
  // D-04: after a hole the player lands at the start of this chunk.
  const afterHole = context.previousKind === 'gap' || context.previousPattern === 'fishing-hut';
  const clearUntilX = afterHole
    ? context.startX + LANDING.REACTION_TIME * BASE_WALK_SPEED * speedMultiplierAt(context.startX)
    : context.startX;

  const draft = new ChunkDraft(
    context.startX,
    seed.floorY,
    context.entryY,
    context.previousKind === null || context.previousKind === 'gap',
    difficultyAt(context.startX),
    biomeAt(context.startX),
    streamsFor(seed, context.index, attempt),
    { ...context.carry, wallet: context.carry.wallet + budgetAt(context.startX) },
    clearUntilX
  );

  // The fallback is the safest thing there is: flat ground at the height
  // the player arrives at, nothing on it.
  const shape: Shape = fallback
    ? { kind: 'ground', pattern: null, exitY: context.entryY, cost: 0 }
    : shapeChunk(draft, context);
  if (fallback) draft.ground(6, context.entryY);

  draft.carry.wallet -= shape.cost;
  draft.carry.tension = shape.kind === 'rest' ? 0 : context.carry.tension * TENSION.DECAY + shape.cost;
  if (!draft.carry.goal) draft.carry.goal = pickGoal(draft);

  return {
    index: context.index,
    attempt,
    startX: context.startX,
    endX: draft.x,
    entryY: context.entryY,
    exitY: shape.exitY,
    biome: draft.biome,
    kind: shape.kind,
    pattern: shape.pattern,
    cost: shape.cost,
    pieces: draft.pieces,
    carry: { ...draft.carry },
  };
}

/**
 * Plans one chunk from the seed and its context alone. A chunk that cannot
 * be crossed is planned again from another stream; if none can, it falls
 * back to plain ground (its attempt is then MAX_ATTEMPTS).
 */
export function planChunk(seed: WorldSeed, context: ChunkContext): ChunkPlan {
  const entry = {
    startX: context.startX,
    entryY: context.entryY,
    surface: context.entrySurface,
    mustLand: context.previousKind === null || context.previousKind === 'gap',
  };
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const plan = draftChunk(seed, context, attempt, false);
    if (checkChunk(plan, entry).length === 0) return plan;
  }
  return draftChunk(seed, context, MAX_ATTEMPTS, true);
}

/** Plans the world chunk after chunk, from the start. */
export class WorldGenerator {
  private context: ChunkContext;

  constructor(private readonly seed: WorldSeed) {
    this.context = firstContext(seed.floorY);
  }

  next(): ChunkPlan {
    const plan = planChunk(this.seed, this.context);
    this.context = nextContext(plan);
    return plan;
  }
}
