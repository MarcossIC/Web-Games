import { Board } from './board';
import { CLAMP_WIDTH, CLIP_WIDTH, RING_RADIUS, SAMPLE_STEP, TUBE, CLEARANCE } from './config';
import { measure, type LevelStats } from './difficulty';
import { distanceToPolyline, radians, samplePolyline, seededRandom, vec, type Vec } from './geometry';
import { LEVELS, place } from './levels';
import { plan, playMove, progressMoves } from './solver';
import type { ClipSpec, LevelSpec, Move, PieceColor, RingSpec, RodSpec } from './types';
import { levelProblems } from './validate';

/**
 * The boards of Infinite: a new one for every stage, each a little harder.
 *
 * A stage is built from its number alone, so stage 12 is the same board
 * every time it is played. A board is kept only if it is proven clearable:
 * `plan` finds a way through it, the way is played through the rules move
 * by move, and it does not ask for a turn more exact than a finger can
 * give. Hard is fine; impossible never ships. Among the boards that pass,
 * the one kept is the one whose pieces get most in each other's way, near
 * the difficulty the stage asks for. If none passes, a puzzle made by hand
 * is turned around and played instead, so a stage always has a board.
 *
 * Changing anything here changes the boards: bump GENERATOR_VERSION, and
 * the best times kept for the old ones are dropped.
 */
export const GENERATOR_VERSION = 1;

/** What a stage asks of its board. */
export interface StageRecipe {
  /** Rings, threaded ones included. */
  readonly rings: number;
  /** Rings threaded through another, at most: each comes with a ring that holds it or that it holds. */
  readonly threaded: number;
  readonly rods: number;
  /** The least share of the pieces that must get in another's way, or be held back by one. */
  readonly minShare: number;
  /** The least number of pieces held back by another at some point. */
  readonly minBlocked: number;
  /** The difficulty aimed at, as `difficultyOf` counts it. */
  readonly target: number;
  /** Boards built before the best is taken. */
  readonly tries: number;
}

/** A stage's board, with how it measured. */
export interface GeneratedStage {
  readonly stage: number;
  /** The board. Its `solution` is the way `plan` found, proven by playing it. */
  readonly level: LevelSpec;
  readonly stats: LevelStats;
  readonly difficulty: number;
  /** No built board passed, and this one is a puzzle made by hand, turned around. */
  readonly fallback: boolean;
}

/** What the page asks the worker that builds stages. */
export interface StageRequest {
  readonly stage: number;
}

/** What the worker answers: the board of the stage asked for. */
export interface StageReply {
  readonly stage: number;
  readonly level: LevelSpec;
}

/** Builds the stage a request asks for: what the worker does, and the page when there is none. */
export function answerStageRequest(request: StageRequest): StageReply {
  return { stage: request.stage, level: generateStage(request.stage).level };
}

/** From this stage on, boards stop growing: bigger would only be smaller on a phone. */
export const STAGE_OF_FULL_SIZE = 30;

/** How far apart rings joined by a clip are, centre to centre: the arm between them is about 24 long. */
const LINK = RING_RADIUS * 2 + 24;
/** Rings not threaded through each other are at least this far apart, centre to centre. */
const APART = LINK - 10;
/** The largest board, in board units, long side and short side: about the size of the last level made by hand. */
const MAX_LONG = 720;
const MAX_SHORT = 560;
/** How far past the outermost rings a rod may reach, beyond their tubes. */
const ROD_REACH = 70;
/** How far from the edge of an opening a clip or an arm must stay, in degrees. */
const CLEAR_OF_OPENING = 26;
/** How far inside an opening a threaded tube must cross, in degrees. */
const INSIDE_OPENING = 22;
/** How much a turn that makes room may be off, in degrees, and still make it. */
const TOLERANCE = 6;
/** How far `plan` looks while a stage is built. */
const PLAN = { depth: 3, budget: 2500 } as const;

const COLORS: readonly PieceColor[] = [
  'orange',
  'blue',
  'purple',
  'green',
  'red',
  'teal',
  'yellow',
  'pink',
  'navy',
  'lime',
];

/**
 * What stage `stage` asks for. Stage 1 is a handful of pieces that already
 * get in each other's way; boards grow, and ask for more of their pieces to
 * be tangled, until STAGE_OF_FULL_SIZE. From there they keep their size and
 * stay that hard: a bigger board would only be drawn smaller on a phone.
 */
export function stageRecipe(stage: number): StageRecipe {
  const s = Math.max(1, Math.floor(stage));
  const grow = Math.min(s - 1, STAGE_OF_FULL_SIZE - 1) / (STAGE_OF_FULL_SIZE - 1);
  const pieces = Math.round(4 + 10 * grow);
  const rods = Math.round(pieces * 0.4);
  const rings = pieces - rods;
  const threaded = s < 4 ? 0 : Math.min(Math.floor((rings - 1) / 3), s < 15 ? 1 : 2);
  // Past full size the boards ask for a little more, up to what they can hold.
  const beyond = Math.max(0, s - STAGE_OF_FULL_SIZE);
  return {
    rings,
    threaded,
    rods,
    minShare: Math.min(0.9, 0.5 + 0.3 * grow + 0.005 * beyond),
    minBlocked: Math.max(1, Math.round(pieces * (0.3 + 0.25 * grow))),
    target: 2 + pieces * (0.6 + 0.5 * grow) + Math.min(3, beyond * 0.1),
    tries: 18 + Math.round(10 * grow),
  };
}

/**
 * How hard a board is, as one number: pieces held back by another count
 * most, turns that only make room more still; a big board is a little
 * harder only for being big.
 */
export function difficultyOf(stats: LevelStats): number {
  return stats.blocked + 2 * stats.setups + 0.5 * stats.blockers + 0.25 * stats.pieces;
}

/** The board of stage `stage` (from 1). The same stage gives the same board. */
export function generateStage(stage: number): GeneratedStage {
  const s = Math.max(1, Math.floor(stage));
  const recipe = stageRecipe(s);
  const rand = seededRandom(seedOf(s));

  let best: { level: LevelSpec; stats: LevelStats; difficulty: number; fits: boolean } | null = null;
  for (let attempt = 0; attempt < recipe.tries; attempt++) {
    const draft = buildBoard(rand, recipe);
    if (!draft) continue;
    const proven = withoutLooseRods(prove(draft));
    if (!proven) continue;
    const difficulty = difficultyOf(proven.stats);
    const fits = proven.stats.share >= recipe.minShare && proven.stats.blocked >= recipe.minBlocked;
    const candidate = { ...proven, difficulty, fits };
    if (!best || better(candidate, best, recipe.target)) best = candidate;
    // Close enough to what the stage asks: no need to build more.
    if (fits && Math.abs(difficulty - recipe.target) <= recipe.target * 0.12) break;
  }
  if (best && best.stats.share >= Math.min(0.5, recipe.minShare)) {
    return { stage: s, level: best.level, stats: best.stats, difficulty: best.difficulty, fallback: false };
  }
  return { stage: s, ...handMade(s, rand), fallback: true };
}

/** A board that passes beats one that does not; between two alike, the one nearer the target, a little over before under. */
function better(
  a: { difficulty: number; fits: boolean },
  b: { difficulty: number; fits: boolean },
  target: number
): boolean {
  if (a.fits !== b.fits) return a.fits;
  const miss = (d: number) => (d >= target ? d - target : (target - d) * 1.5);
  return miss(a.difficulty) < miss(b.difficulty);
}

function seedOf(stage: number): number {
  let h = (stage * 0x9e3779b1) ^ (GENERATOR_VERSION * 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

// ---- Proving a board -------------------------------------------------

/**
 * The board with a way through it and its measure, or null if it is drawn
 * wrong, no way is found, the way does not play, or it asks for a turn
 * more exact than TOLERANCE.
 */
export function prove(level: LevelSpec): { level: LevelSpec; stats: LevelStats } | null {
  if (levelProblems(level).length > 0) return null;
  const solution = plan(Board.load(level), PLAN);
  if (!solution || !clears(level, solution) || !forgiving(level, solution)) return null;
  return { level: { ...level, solution }, stats: measure(level, solution) };
}

/**
 * The board without the rods that took no part in it, proven again: a rod
 * nothing waits for and that waits for nothing is only one more tap.
 * Taking rods away only leaves the others more room, so it stays clearable;
 * it is proven again all the same, for its own way through.
 */
function withoutLooseRods(proven: { level: LevelSpec; stats: LevelStats } | null): typeof proven {
  if (!proven || proven.stats.looseRods.length === 0) return proven;
  const loose = new Set(proven.stats.looseRods);
  const rods = (proven.level.rods ?? []).filter((_, id) => !loose.has(id));
  return prove({ ...proven.level, rods, solution: [] });
}

/** Every move goes all the way and the board ends cleared. */
export function clears(level: LevelSpec, solution: readonly Move[]): boolean {
  const board = Board.load(level);
  for (const move of solution) {
    if (board.cleared || !playMove(board, move).ok) return false;
  }
  return board.cleared;
}

/**
 * Each run of turns that only make room still makes room when every turn
 * of it stops TOLERANCE degrees short, or goes that much further: the
 * player turns by hand, not to the degree.
 */
function forgiving(level: LevelSpec, solution: readonly Move[]): boolean {
  const board = Board.load(level);
  let k = 0;
  while (k < solution.length) {
    const run: { ring: number; turn: number }[] = [];
    const probe = board.clone();
    for (let j = k; j < solution.length; j++) {
      const move = solution[j];
      if ('rod' in move || playMove(probe, move).events.length > 0) break;
      run.push(move);
    }
    if (run.length > 0) {
      for (const off of [-TOLERANCE, TOLERANCE]) {
        const nudged = board.clone();
        for (const move of run) {
          const size = Math.abs(move.turn);
          const turn = Math.sign(move.turn) * Math.max(size / 2, size + off);
          nudged.turn(move.ring, radians(turn));
        }
        if (progressMoves(nudged).length === 0) return false;
      }
    }
    for (let j = 0; j < Math.max(1, run.length); j++) playMove(board, solution[k + j]);
    k += Math.max(1, run.length);
  }
  return true;
}

// ---- Building a board ------------------------------------------------

interface DraftRing {
  x: number;
  y: number;
  /** Width of the opening in degrees; 0 is closed. */
  gap: number;
  facing: number;
  /** Directions, in degrees, the opening must cover: where a threaded tube crosses this one. */
  readonly cover: number[];
}

interface Draft {
  readonly rings: DraftRing[];
  readonly clips: ClipSpec[];
}

type Rand = () => number;

const between = (rand: Rand, lo: number, hi: number) => lo + (hi - lo) * rand();
const below = (rand: Rand, n: number) => Math.floor(rand() * n);
const chance = (rand: Rand, p: number) => rand() < p;
const pick = <T>(rand: Rand, items: readonly T[]): T => items[below(rand, items.length)];

/** The items in a random order. Not `sort` with a random comparison: each browser sorts its own way. */
function shuffle<T>(rand: Rand, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = below(rand, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const round1 = (v: number) => Math.round(v * 10) / 10;
const dirOf = (degrees: number): Vec => vec(Math.cos(radians(degrees)), Math.sin(radians(degrees)));
const degreesTo = (from: { x: number; y: number }, to: { x: number; y: number }) =>
  (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
const apart = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
/** How far apart two directions are, in degrees, from 0 to 180. */
const angleBetween = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

/** One board as the recipe asks, before it is proven; null if the pieces would not fit. */
function buildBoard(rand: Rand, recipe: StageRecipe): LevelSpec | null {
  const threaded = below(rand, recipe.threaded + 1);
  const tree = growTree(rand, recipe.rings - threaded * 2);
  if (!tree) return null;
  for (let i = 0; i < threaded; i++) threadPair(rand, tree);
  if (!chooseFacings(rand, tree)) return null;

  const rings: RingSpec[] = tree.rings.map((r) => ({ x: r.x, y: r.y, gap: r.gap, facing: r.facing, color: 'orange' }));
  // One more than asked: the rods that turn out to take no part are taken away again.
  const rods = addRods(rand, rings, tree.clips, recipe.rods + 1);
  const level = paint(rand, { rings, clips: tree.clips, rods, solution: [] });

  const b = Board.load(level).bounds();
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  if (Math.max(w, h) > MAX_LONG || Math.min(w, h) > MAX_SHORT) return null;
  return level;
}

/**
 * Rings held together by clips, in a tree: every ring hangs from the board
 * by one chain. A closed ring only ever holds. Each new ring goes in a free
 * spot beside the tree, nearer the middle likelier, so the board grows
 * round rather than long. An open ring is joined to two at most: with a
 * third, no side would be left for its opening.
 */
function growTree(rand: Rand, count: number): Draft | null {
  const rings: DraftRing[] = [ringAt(0, 0, count >= 3 && chance(rand, 0.35) ? 0 : openGap(rand))];
  const clips: ClipSpec[] = [];
  /** Directions, in degrees, from each ring to those it is joined to. */
  const joined: number[][] = [[]];
  while (rings.length < count) {
    const mx = rings.reduce((sum, r) => sum + r.x, 0) / rings.length;
    const my = rings.reduce((sum, r) => sum + r.y, 0) / rings.length;
    const spots: { parent: number; at: number; x: number; y: number; weight: number }[] = [];
    rings.forEach((ring, parent) => {
      if (joined[parent].length >= (ring.gap === 0 ? 4 : 2)) return;
      for (let k = 0; k < 12; k++) {
        const at = 30 * k;
        if (joined[parent].some((a) => angleBetween(a, at) < 60)) continue;
        const x = Math.round(ring.x + LINK * dirOf(at).x);
        const y = Math.round(ring.y + LINK * dirOf(at).y);
        if (rings.some((r) => apart(r, { x, y }) < APART)) continue;
        spots.push({ parent, at, x, y, weight: Math.exp(-apart({ x, y }, { x: mx, y: my }) / (LINK * 0.6)) });
      }
    });
    if (spots.length === 0) return null;
    let left = rand() * spots.reduce((sum, spot) => sum + spot.weight, 0);
    const spot = spots.find((s) => (left -= s.weight) <= 0) ?? spots[spots.length - 1];

    const { parent } = spot;
    const id = rings.length;
    const closed = rings[parent].gap > 0 && chance(rand, 0.12);
    rings.push(ringAt(spot.x, spot.y, closed ? 0 : openGap(rand)));
    joined.push([spot.at + 180]);
    joined[parent].push(spot.at);
    if (rings[parent].gap === 0) clips.push({ from: parent, on: id });
    else if (closed) clips.push({ from: id, on: parent });
    else clips.push(chance(rand, 0.55) ? { from: parent, on: id } : { from: id, on: parent });
  }
  return { rings, clips };
}

function ringAt(x: number, y: number, gap: number): DraftRing {
  return { x, y, gap, facing: 0, cover: [] };
}

function openGap(rand: Rand): number {
  return pick(rand, [90, 100, 100, 110, 120]);
}

/**
 * A ring threaded through one of the tree: closer than a clip could hold
 * them, so each tube crosses the other where the other is open. It hangs
 * by a clip from one more ring, further out.
 */
function threadPair(rand: Rand, tree: Draft): boolean {
  const { rings, clips } = tree;
  // A host joined to two rings already would have no side left that its opening could face.
  const joinedTo = (i: number) => clips.filter((c) => c.from === i || c.on === i).length;
  const hosts = rings.map((r, i) => i).filter((i) => rings[i].gap > 0 && rings[i].cover.length === 0 && joinedTo(i) <= 1);
  for (let tries = 0; tries < 16 && hosts.length > 0; tries++) {
    const h = pick(rand, hosts);
    const host = rings[h];
    const d = Math.round(between(rand, 60, 70));
    const theta = 15 * below(rand, 24);
    const t = { x: Math.round(host.x + d * dirOf(theta).x), y: Math.round(host.y + d * dirOf(theta).y) };
    if (rings.some((r, i) => i !== h && apart(r, t) < APART)) continue;
    const phi = theta + between(rand, -70, 70);
    const u = { x: Math.round(t.x + LINK * dirOf(phi).x), y: Math.round(t.y + LINK * dirOf(phi).y) };
    if (rings.some((r) => apart(r, u) < APART)) continue;

    // Where the two circles cross, seen from the host: one in each opening.
    const half = (Math.acos(d / (2 * RING_RADIUS)) * 180) / Math.PI;
    const [mine, theirs] = chance(rand, 0.5) ? [theta + half, theta - half] : [theta - half, theta + half];
    const crossing = { x: host.x + RING_RADIUS * dirOf(theirs).x, y: host.y + RING_RADIUS * dirOf(theirs).y };
    host.cover.push(mine);
    host.gap = Math.max(host.gap, pick(rand, [110, 120, 136]));
    const ti = rings.length;
    rings.push({ ...t, gap: pick(rand, [110, 120, 136, 140]), facing: 0, cover: [degreesTo(t, crossing)] });
    rings.push(ringAt(u.x, u.y, openGap(rand)));
    clips.push(chance(rand, 0.6) ? { from: ti + 1, on: ti } : { from: ti, on: ti + 1 });
    return true;
  }
  return false;
}

/**
 * Where each opening faces: never towards a ring it is joined to by a clip
 * (the clip or the arm sits there), always over a tube threaded through it.
 */
function chooseFacings(rand: Rand, tree: Draft): boolean {
  const { rings, clips } = tree;
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    if (ring.gap === 0) continue;
    const keepOut = clips
      .filter((c) => c.from === i || c.on === i)
      .map((c) => degreesTo(ring, rings[c.from === i ? c.on : c.from]));
    const half = ring.gap / 2;
    const options: number[] = [];
    for (let f = 0; f < 360; f += 5) {
      if (keepOut.some((a) => angleBetween(f, a) < half + CLEAR_OF_OPENING)) continue;
      if (ring.cover.some((a) => angleBetween(f, a) > half - INSIDE_OPENING)) continue;
      options.push(f);
    }
    if (options.length === 0) return false;
    ring.facing = pick(rand, options);
  }
  return true;
}

/**
 * Rods laid where they get in the way: across the opening of a ring (it
 * cannot turn far until the rod is out), pointing at the tube of a ring
 * (it cannot come out until the ring is gone or turns its opening there),
 * or across the way out of another rod.
 */
function addRods(rand: Rand, rings: readonly RingSpec[], clips: readonly ClipSpec[], count: number): RodSpec[] {
  const rods: RodSpec[] = [];
  const open = rings.filter((r) => (r.gap ?? 0) > 0);
  for (let tries = 0; rods.length < count && tries < count * 12; tries++) {
    const roll = rand();
    const rod =
      rods.length > 0 && roll < 0.3
        ? rodAcrossRod(rand, pick(rand, rods))
        : roll < 0.65 && open.length > 0
          ? rodThroughOpening(rand, pick(rand, open))
          : rodAtTube(rand, pick(rand, rings));
    if (rodFits(rod, rings, clips, rods)) rods.push(rod);
  }
  return rods;
}

function rodThroughOpening(rand: Rand, ring: RingSpec): RodSpec {
  const gap = ring.gap ?? 0;
  const a = (ring.facing ?? 0) + between(rand, -1, 1) * Math.max(0, gap / 2 - 22);
  const p = { x: ring.x + RING_RADIUS * dirOf(a).x, y: ring.y + RING_RADIUS * dirOf(a).y };
  const way = pick(rand, [a, a, a + 180, a + 90, a - 90, between(rand, 0, 360)]);
  return rodThrough(rand, p, way);
}

function rodAtTube(rand: Rand, ring: RingSpec): RodSpec {
  const b = between(rand, 0, 360);
  const out = dirOf(b);
  const head = RING_RADIUS + TUBE / 2 + between(rand, 10, 34);
  const length = between(rand, 70, 160);
  const h = { x: ring.x + head * out.x, y: ring.y + head * out.y };
  // It slides towards the ring: tail outside, head at the tube.
  return {
    tail: [round1(h.x + length * out.x), round1(h.y + length * out.y)],
    head: [round1(h.x), round1(h.y)],
    clamp: round1(between(rand, 0.2, 0.6)),
    color: 'orange',
  };
}

function rodAcrossRod(rand: Rand, other: RodSpec): RodSpec {
  const tail = vec(other.tail[0], other.tail[1]);
  const head = vec(other.head[0], other.head[1]);
  const along = degreesTo(tail, head);
  const ahead = between(rand, 16, 60);
  const q = { x: head.x + ahead * dirOf(along).x, y: head.y + ahead * dirOf(along).y };
  return rodThrough(rand, q, along + 90 + between(rand, -25, 25) + (chance(rand, 0.5) ? 180 : 0));
}

/** A rod through point `p`, sliding the way `way` points (degrees). */
function rodThrough(rand: Rand, p: { x: number; y: number }, way: number): RodSpec {
  const length = between(rand, 80, 190);
  const behind = length * between(rand, 0.15, 0.85);
  const d = dirOf(way);
  return {
    tail: [round1(p.x - behind * d.x), round1(p.y - behind * d.y)],
    head: [round1(p.x + (length - behind) * d.x), round1(p.y + (length - behind) * d.y)],
    clamp: round1(between(rand, 0.2, 0.75)),
    color: 'orange',
  };
}

/**
 * The rod lies clear of everything already on the board, its clamp too.
 * `levelProblems` checks the whole board once it is done; this only keeps
 * from building boards that fail it.
 */
function rodFits(rod: RodSpec, rings: readonly RingSpec[], clips: readonly ClipSpec[], rods: readonly RodSpec[]): boolean {
  // Rods stay among the rings: one sticking far out only makes the board smaller on the screen.
  const reach = RING_RADIUS + ROD_REACH;
  const inside = ([x, y]: readonly [number, number]) =>
    x >= Math.min(...rings.map((r) => r.x)) - reach &&
    x <= Math.max(...rings.map((r) => r.x)) + reach &&
    y >= Math.min(...rings.map((r) => r.y)) - reach &&
    y <= Math.max(...rings.map((r) => r.y)) + reach;
  if (!inside(rod.tail) || !inside(rod.head)) return false;
  const level: LevelSpec = { rings, clips, rods: [...rods, rod], solution: [] };
  const board = Board.load(level);
  const mine = board.rods[rods.length];
  const own = samplePolyline(mine.points, SAMPLE_STEP);
  const xs = own.map((p) => p.x);
  const ys = own.map((p) => p.y);
  const margin = TUBE + CLIP_WIDTH;
  const [minX, maxX, minY, maxY] = [Math.min(...xs) - margin, Math.max(...xs) + margin, Math.min(...ys) - margin, Math.max(...ys) + margin];
  for (const blob of board.blobs({ rod: mine.id })) {
    if (blob.x < minX || blob.x > maxX || blob.y < minY || blob.y > maxY) continue;
    for (const p of own) {
      if (Math.hypot(blob.x - p.x, blob.y - p.y) < TUBE / 2 + blob.r + CLEARANCE + 1) return false;
    }
  }
  const c = mine.clamp;
  for (const ring of board.rings) {
    if (Math.abs(Math.hypot(c.x - ring.center.x, c.y - ring.center.y) - ring.radius) < CLAMP_WIDTH / 2 + TUBE / 2 + 2) {
      return false;
    }
  }
  for (const clip of board.clips) {
    if (Math.min(apart(c, clip.sleeve), apart(c, clip.weld)) < CLAMP_WIDTH / 2 + CLIP_WIDTH / 2 + 2) return false;
  }
  for (const other of board.rods) {
    if (other.id === mine.id) continue;
    if (distanceToPolyline(c, other.points) < CLAMP_WIDTH / 2 + TUBE / 2 + 2) return false;
    if (apart(c, other.clamp) < CLAMP_WIDTH + 4) return false;
  }
  return true;
}

/** Colours for the pieces, none the same as a piece beside it. */
function paint(rand: Rand, level: LevelSpec): LevelSpec {
  const order = shuffle(rand, COLORS);
  const spots: { x: number; y: number; points?: Vec[]; color?: PieceColor }[] = [
    ...level.rings.map((r) => ({ x: r.x, y: r.y })),
    ...(level.rods ?? []).map((r) => {
      const points = [vec(r.tail[0], r.tail[1]), vec(r.head[0], r.head[1])];
      return { x: (r.tail[0] + r.head[0]) / 2, y: (r.tail[1] + r.head[1]) / 2, points };
    }),
  ];
  const near = (a: (typeof spots)[number], b: (typeof spots)[number]) => {
    if (a.points || b.points) {
      const rod = a.points ? a : b;
      const other = rod === a ? b : a;
      const reach = other.points ? 60 : RING_RADIUS + 50;
      return distanceToPolyline(vec(other.x, other.y), rod.points!) < reach;
    }
    return apart(a, b) < LINK * 1.45;
  };
  const used = new Map<PieceColor, number>();
  for (const spot of spots) {
    const taken = new Set(spots.filter((o) => o !== spot && o.color && near(spot, o)).map((o) => o.color));
    const free = order.filter((c) => !taken.has(c));
    const choices = free.length > 0 ? free : order;
    spot.color = choices.reduce((best, c) => ((used.get(c) ?? 0) < (used.get(best) ?? 0) ? c : best), choices[0]);
    used.set(spot.color, (used.get(spot.color) ?? 0) + 1);
  }
  const ringCount = level.rings.length;
  return {
    ...level,
    rings: level.rings.map((r, i) => ({ ...r, color: spots[i].color! })),
    rods: (level.rods ?? []).map((r, i) => ({ ...r, color: spots[ringCount + i].color! })),
  };
}

// ---- When nothing built passes ----------------------------------------

/** One of the later levels made by hand, turned, mirrored and recoloured: proven like any other board. */
function handMade(stage: number, rand: Rand): { level: LevelSpec; stats: LevelStats; difficulty: number } {
  const later = LEVELS.slice(7);
  for (let tries = 0; tries < 8; tries++) {
    const base = later[(stage + tries) % later.length];
    const shuffled = shuffle(rand, COLORS);
    const colors = Object.fromEntries(COLORS.map((c, i) => [c, shuffled[i]])) as Record<PieceColor, PieceColor>;
    const level = place(base, { turn: 90 * below(rand, 4), mirror: chance(rand, 0.5), colors });
    if (levelProblems(level).length === 0 && clears(level, level.solution)) {
      const stats = measure(level, level.solution);
      return { level, stats, difficulty: difficultyOf(stats) };
    }
  }
  const level = LEVELS[LEVELS.length - 1];
  const stats = measure(level, level.solution);
  return { level, stats, difficulty: difficultyOf(stats) };
}
