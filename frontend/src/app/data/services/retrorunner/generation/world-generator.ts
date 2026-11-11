import SeededRandom from '../utils/SeededRandom';
import {
  BRIDGE_CHANCE_PER_OBSTACLE,
  COST,
  ELEVATION,
  FIRST_GAP_INDEX,
  HARD_CHUNK_COST,
  HUT_CHANCE,
  HUT_MAX_ELEVATION,
  MAX_ATTEMPTS,
  REST_AFTER_HARD_CHUNKS,
  REST_CHANCE,
  SAFE_START_END_X,
} from './balance';
import { ChunkDraft, ChunkStreams } from './chunk-draft';
import { BiomeType, ChunkContext, ChunkKind, ChunkPlan, PatternName } from './chunk-plan';
import { biomeAt, difficultyAt, isUnlocked } from './difficulty-curve';
import { planArcCoins } from './fill';
import { TILE } from './geometry';
import { jumpReach } from './jump-model';
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
    carry: { hardStreak: 0, lastObstacleX: 0, lastTreeX: 0, lastLargeDecoX: 0 },
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
 */
function planGround(draft: ChunkDraft, arriving = false): Shape {
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
    draft.stone(floor.startX, floor.endX, y, d.obstacleChance);
  }
  return { kind: 'ground', pattern: null, exitY: y, cost: stoneCost(draft) };
}

/** A long flat breather a little lower down: coins, no hazards. */
function planRest(draft: ChunkDraft): Shape {
  const y = draft.mustStartLevel
    ? draft.entryY
    : draft.floorY + Math.min(0, draft.entryElevation + ELEVATION.RETURN);
  const floor = draft.ground(draft.rng.terrain.intBetween(8, 12), y);
  draft.coins(floor.startX, floor.endX, y, draft.difficulty.coinChance);
  draft.decoration(floor.startX, floor.endX, y);
  return { kind: 'rest', pattern: null, exitY: y, cost: 0 };
}

/**
 * A hole up to the next chunk, which starts with the landing. An open
 * hole brings the floor down; one with a bridge keeps both edges level.
 */
function planGap(draft: ChunkDraft): Shape {
  const { terrain } = draft.rng;
  const d = draft.difficulty;
  const width = terrain.intBetween(d.minGapWidth, d.maxGapWidth);
  const bridged =
    isUnlocked('bridges', draft.startX) && terrain.chance(d.obstacleChance * BRIDGE_CHANCE_PER_OBSTACLE);

  const exitY = bridged ? draft.entryY : draft.floorY + Math.min(0, draft.entryElevation + ELEVATION.RETURN);
  const endX = draft.startX + width;
  if (bridged) {
    draft.add({ type: 'bridge', startX: draft.startX + TILE.END_WIDTH, endX, floorY: draft.entryY });
  }
  draft.add(...planArcCoins(draft.startX, endX, exitY));
  draft.x = endX;

  const hole = width - TILE.END_WIDTH;
  const cost = hole / jumpReach(exitY - draft.entryY) + (bridged ? COST.BRIDGE : 0);
  return { kind: 'gap', pattern: null, exitY, cost };
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

/** Decides what the chunk is, in the order the draws were always taken. */
function shapeChunk(draft: ChunkDraft, context: ChunkContext): Shape {
  const { terrain } = draft.rng;
  const d = draft.difficulty;
  if (draft.startX < SAFE_START_END_X) return planGround(draft, true);

  if (context.carry.hardStreak >= REST_AFTER_HARD_CHUNKS && terrain.chance(REST_CHANCE)) {
    return planRest(draft);
  }

  const afterHole = context.previousKind === 'gap' || context.previousPattern === 'fishing-hut';
  if (context.index >= FIRST_GAP_INDEX && !afterHole && terrain.chance(d.gapChance)) {
    if (
      draft.biome === BiomeType.DUSK &&
      draft.entryElevation > HUT_MAX_ELEVATION &&
      terrain.chance(HUT_CHANCE)
    ) {
      return planPattern(draft, 'fishing-hut');
    }
    return planGap(draft);
  }

  if (draft.entryElevation > ELEVATION.MAX && terrain.chance(d.patternChance)) {
    return planPattern(draft, terrain.pick(availablePatterns(draft)));
  }

  return planGround(draft);
}

function draftChunk(seed: WorldSeed, context: ChunkContext, attempt: number, fallback: boolean): ChunkPlan {
  const draft = new ChunkDraft(
    context.startX,
    seed.floorY,
    context.entryY,
    context.previousKind === null || context.previousKind === 'gap',
    difficultyAt(context.startX),
    biomeAt(context.startX),
    streamsFor(seed, context.index, attempt),
    { ...context.carry }
  );

  // The fallback is the safest thing there is: flat ground at the height
  // the player arrives at, nothing on it.
  const shape: Shape = fallback
    ? { kind: 'ground', pattern: null, exitY: context.entryY, cost: 0 }
    : shapeChunk(draft, context);
  if (fallback) draft.ground(6, context.entryY);

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
    carry: {
      ...draft.carry,
      hardStreak: shape.cost >= HARD_CHUNK_COST ? context.carry.hardStreak + 1 : 0,
    },
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
