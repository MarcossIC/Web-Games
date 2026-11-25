import { RING_RADIUS } from './config';
import type { ClipSpec, LevelSpec, Move, PieceColor, RingSpec, RodSpec } from './types';

/**
 * The levels of Ring Out, easiest first. Each one carries a solution that
 * the tests play through the rules, so a level that cannot be cleared, or
 * whose pieces overlap, never ships.
 *
 * Linked rings sit LINK apart, so the arm between them is about 24 units
 * long; rings that overlap are threaded through each other's openings.
 */
const LINK = RING_RADIUS * 2 + 24;

function ring(x: number, y: number, color: PieceColor, facing: number, extra: Partial<RingSpec> = {}): RingSpec {
  return { x, y, color, facing, ...extra };
}

/** A closed ring: it can only hold, never be held. */
function hoop(x: number, y: number, color: PieceColor, extra: Partial<RingSpec> = {}): RingSpec {
  return { x, y, color, gap: 0, ...extra };
}

function clip(from: number, on: number, at?: number): ClipSpec {
  return at === undefined ? { from, on } : { from, on, at };
}

/** The point `distance` from (x, y) in the direction `angle` (degrees, clockwise from the right). */
function from(x: number, y: number, angle: number, distance = LINK): [number, number] {
  const a = (angle * Math.PI) / 180;
  return [Math.round((x + distance * Math.cos(a)) * 10) / 10, Math.round((y + distance * Math.sin(a)) * 10) / 10];
}

function rod(tail: [number, number], head: [number, number], color: PieceColor, extra: Partial<RodSpec> = {}): RodSpec {
  return { tail, head, color, ...extra };
}

const L = LINK;
const [s60x, s60y] = from(0, 0, 60);
const [s120x, s120y] = from(0, 0, 120);
const [s240x, s240y] = from(0, 0, 240);

const FIRST: readonly LevelSpec[] = [
  // 1. One clip, one turn.
  {
    tip: 'Tap a ring to give it a quarter turn. Slide its tube out of the clip.',
    rings: [ring(0, 0, 'orange', 180), ring(L, 0, 'blue', 90)],
    clips: [clip(0, 1)],
    solution: [{ ring: 1, turn: 90 }],
  },
  // 2. A chain: the free end goes first.
  {
    tip: 'A ring that holds a clip cannot turn. Free the others first.',
    rings: [ring(0, 0, 'orange', 180), ring(L, 0, 'blue', 0), ring(s60x, s60y, 'purple', 90)],
    clips: [clip(0, 1), clip(2, 0)],
    solution: [
      { ring: 1, turn: 180 },
      { ring: 0, turn: -90 },
    ],
  },
  // 3. A closed ring holds three: it goes when they all have.
  {
    rings: [
      hoop(0, 0, 'yellow'),
      ring(L, 0, 'blue', 0),
      ring(s120x, s120y, 'green', 210),
      ring(s240x, s240y, 'pink', 330),
    ],
    clips: [clip(0, 1), clip(0, 2), clip(0, 3)],
    solution: [
      { ring: 1, turn: 180 },
      { ring: 2, turn: 90 },
      { ring: 3, turn: 90 },
    ],
  },
  // 4. A rod through the opening: pull it out first.
  {
    tip: 'Tap a rod to slide it out of its clamp. It needs a clear way.',
    rings: [ring(0, 0, 'orange', 180), ring(L, 0, 'blue', 0)],
    clips: [clip(0, 1)],
    rods: [rod([L + 22, 0], [L + 170, 0], 'green')],
    solution: [{ rod: 0 }, { ring: 1, turn: 180 }],
  },
  // 5. The rod cannot come out through the ring, and the ring only turns one way.
  {
    tip: 'Drag a ring around to turn it either way.',
    rings: [ring(-L, 0, 'orange', 180), ring(0, 0, 'blue', 270, { gap: 110 })],
    clips: [clip(0, 1)],
    rods: [rod([-27, -110], [-27, 12], 'green', { clamp: 0.22 })],
    solution: [{ ring: 1, turn: -60 }, { rod: 0 }],
  },
  // 6. Threaded: turn the wide one to face the other and let it out.
  {
    tip: 'Rings threaded through each other get in the way. Open a way out.',
    rings: [
      ring(-L, 0, 'orange', 180),
      ring(0, 0, 'blue', 310, { gap: 136 }),
      ring(65, 0, 'pink', 130),
      ring(65 + L, 0, 'green', 0),
    ],
    clips: [clip(0, 1), clip(3, 2)],
    solution: [
      { ring: 1, turn: 50 },
      { ring: 2, turn: -100 },
      { ring: 1, turn: 135 },
    ],
  },
  // 7. A small tree: start from the leaves.
  {
    rings: [
      hoop(0, 0, 'red'),
      ring(-L, 0, 'teal', 225),
      ring(L, 0, 'yellow', 60),
      ring(-L, L, 'purple', 90),
      ring(...from(L, 0, 300), 'blue', 300),
    ],
    clips: [clip(0, 1), clip(0, 2), clip(1, 3), clip(4, 2)],
    solution: [
      { ring: 3, turn: 180 },
      { ring: 1, turn: 105 },
      { ring: 2, turn: 210 },
    ],
  },
  // 8. Rods in each other's way.
  {
    rings: [hoop(0, 0, 'orange'), ring(L, 0, 'blue', 270), ring(0, -L, 'pink', 210)],
    clips: [clip(0, 1), clip(0, 2, 90)],
    rods: [
      rod([L, -15], [L, -118], 'green', { clamp: 0.45 }),
      rod([L + 110, -150], [75, -150], 'yellow', { clamp: 0.35 }),
    ],
    solution: [{ ring: 2, turn: -90 }, { rod: 1 }, { rod: 0 }, { ring: 1, turn: -60 }],
  },
  // 9. A bent rod: make room for the bend first.
  {
    rings: [ring(-L, 0, 'green', 270), hoop(0, 0, 'red'), ring(L, 0, 'blue', 270)],
    clips: [clip(1, 0), clip(1, 2)],
    rods: [rod([0, -90], [L, -90], 'purple', { bend: [L, -35] })],
    solution: [{ ring: 2, turn: 35 }, { rod: 0 }, { ring: 2, turn: -95 }, { ring: 0, turn: 90 }],
  },
  // 10. A chain of three threaded rings: open the end one, then the middle.
  {
    rings: [
      ring(-L, 0, 'orange', 180),
      ring(0, 0, 'blue', 310, { gap: 136 }),
      ring(65, 0, 'purple', 130),
      ring(130, 0, 'green', 180, { gap: 140 }),
      ring(130 + L, 0, 'red', 0),
      ring(65, -L, 'yellow', 270),
    ],
    clips: [clip(0, 1), clip(5, 2), clip(4, 3)],
    solution: [
      { ring: 1, turn: 50 },
      { ring: 2, turn: 110 },
      { ring: 1, turn: 135 },
      { ring: 3, turn: 130 },
    ],
  },
  // 11. A rod held in by a ring further down.
  {
    rings: [
      hoop(0, 0, 'orange'),
      ring(L, 0, 'blue', 90),
      ring(-L, 0, 'pink', 270),
      ring(154, 175, 'green', 90),
      ring(154 + L, 175, 'yellow', 0),
    ],
    clips: [clip(0, 1), clip(0, 2), clip(4, 3)],
    rods: [rod([L, 20], [L, 110], 'purple')],
    solution: [{ ring: 3, turn: -60 }, { rod: 0 }, { ring: 1, turn: 60 }, { ring: 2, turn: 60 }],
  },
  // 12. Twins that turn opposite ways.
  {
    tip: 'Look closely: each ring has only one way out.',
    rings: [
      hoop(0, 0, 'teal'),
      ring(-L, 0, 'pink', 90, { gap: 110 }),
      ring(L, 0, 'yellow', 90, { gap: 110 }),
    ],
    clips: [clip(0, 1), clip(0, 2)],
    rods: [
      rod([-97.5, 160], [-97.5, -12], 'blue', { clamp: 0.25 }),
      rod([97.5, 160], [97.5, -12], 'blue', { clamp: 0.25 }),
    ],
    solution: [{ ring: 1, turn: -60 }, { ring: 2, turn: 60 }, { rod: 0 }, { rod: 1 }],
  },
  // 13. Dominoes: each rod waits for the next one.
  {
    rings: [hoop(0, 0, 'purple'), ring(-L, 0, 'green', 90), ring(L, 0, 'blue', 90)],
    clips: [clip(0, 1), clip(0, 2)],
    rods: [
      rod([-L, -20], [-L, 100], 'yellow', { clamp: 0.6 }),
      rod([-200, 140], [40, 140], 'pink'),
      rod([80, 230], [80, 60], 'orange'),
    ],
    solution: [{ ring: 2, turn: 60 }, { rod: 2 }, { rod: 1 }, { rod: 0 }, { ring: 1, turn: -60 }],
  },
];

/** Where a level is put inside a bigger one: turned, mirrored and moved. */
export interface Placement {
  readonly x?: number;
  readonly y?: number;
  /** Degrees, clockwise. */
  readonly turn?: number;
  /** Mirrored left to right, before it is turned. */
  readonly mirror?: boolean;
  /** New colors for its pieces, by old color. */
  readonly colors?: Partial<Record<PieceColor, PieceColor>>;
}

/** A level turned, mirrored and moved: the same puzzle, looking different. */
export function place(level: LevelSpec, where: Placement): LevelSpec {
  const turn = where.turn ?? 0;
  const a = (turn * Math.PI) / 180;
  const point = (x: number, y: number): [number, number] => {
    const mx = where.mirror ? -x : x;
    const rx = mx * Math.cos(a) - y * Math.sin(a);
    const ry = mx * Math.sin(a) + y * Math.cos(a);
    return [Math.round((rx + (where.x ?? 0)) * 10) / 10, Math.round((ry + (where.y ?? 0)) * 10) / 10];
  };
  const angle = (deg: number) => (where.mirror ? 180 - deg : deg) + turn;
  const color = (c: PieceColor) => where.colors?.[c] ?? c;
  return {
    rings: level.rings.map((r) => {
      const [x, y] = point(r.x, r.y);
      return { ...r, x, y, facing: angle(r.facing ?? 0), color: color(r.color) };
    }),
    clips: level.clips.map((c) => (c.at === undefined ? c : { ...c, at: angle(c.at) })),
    rods: (level.rods ?? []).map((r) => ({
      ...r,
      tail: point(...r.tail),
      head: point(...r.head),
      ...(r.bend ? { bend: point(...r.bend) } : {}),
      color: color(r.color),
    })),
    solution: level.solution.map((m) => ('rod' in m ? m : { ring: m.ring, turn: where.mirror ? -m.turn : m.turn })),
  };
}

/** Several puzzles on one board, solved one after the other. */
function combine(...levels: LevelSpec[]): LevelSpec {
  const rings: RingSpec[] = [];
  const clips: ClipSpec[] = [];
  const rods: RodSpec[] = [];
  const solution: Move[] = [];
  for (const level of levels) {
    const ringBase = rings.length;
    const rodBase = rods.length;
    rings.push(...level.rings);
    clips.push(...level.clips.map((c) => ({ ...c, from: c.from + ringBase, on: c.on + ringBase })));
    rods.push(...(level.rods ?? []));
    solution.push(
      ...level.solution.map((m) => ('rod' in m ? { rod: m.rod + rodBase } : { ring: m.ring + ringBase, turn: m.turn }))
    );
  }
  return { rings, clips, rods, solution };
}

const at = (n: number) => FIRST[n - 1];

export const LEVELS: readonly LevelSpec[] = [
  ...FIRST,
  // 14. Two puzzles you have met, turned around.
  combine(
    place(at(6), { turn: 90, x: -40, y: 0, colors: { orange: 'teal', green: 'yellow' } }),
    place(at(5), { mirror: true, x: 150, y: 40, colors: { blue: 'red', green: 'purple' } })
  ),
  // 15. A threaded chain standing up, and rods in each other's way.
  combine(
    place(at(10), { turn: -90, x: -60, y: 0 }),
    place(at(8), { mirror: true, x: 260, y: 60, colors: { orange: 'lime', pink: 'navy' } })
  ),
  // 16. Everything at once.
  combine(
    place(at(13), { x: 0, y: 0, colors: { purple: 'navy' } }),
    place(at(9), { turn: 180, x: 0, y: -230, colors: { red: 'orange', green: 'lime', purple: 'teal' } }),
    place(at(12), { x: 430, y: 20, turn: 90, colors: { teal: 'red', pink: 'purple' } })
  ),
];
