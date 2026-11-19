import { GRID } from './config';
import { isSpecialSector, sectorParams, type BrickMix } from './difficulty';
import { mixSeed, Rng } from './rng';
import type { BrickKind } from './types';

/**
 * The sectors: 8 drawn by hand as ASCII maps (3 variants each, the run's
 * seed picks one) and 4 boss arenas for every 5th sector, then a
 * seeded generator for every other sector after 9. A level only says which brick goes in which cell;
 * the engine turns cells into positioned bricks.
 *
 * Legend: `.` empty, `1` normal, `2` tough, `3` armored, `#` steel,
 * `*` explosive, `?` capsule, `%` prism. A `~` after the 13 cells of a row
 * marks it as a moving row (it only moves in sectors that have row motion).
 */

export const LEGEND: Readonly<Record<string, BrickKind | null>> = {
  '.': null,
  '1': 'normal',
  '2': 'tough',
  '3': 'armored',
  '#': 'steel',
  '*': 'explosive',
  '?': 'capsule',
  '%': 'prism',
};

const MOVING_MARK = '~';

/** Tones per theme palette; rows cycle through them so they read as color stripes. */
export const TONE_COUNT = 8;

/**
 * Sector themes (palettes) the view knows; they cycle one per sector.
 * Must match BREAKER_THEME_COUNT in models/breaker/BreakerKeys (a spec checks it).
 */
export const THEME_COUNT = 6;

export function themeForSector(sector: number): number {
  return (((Math.max(1, Math.floor(sector)) - 1) % THEME_COUNT) + THEME_COUNT) % THEME_COUNT;
}

export interface LevelCell {
  col: number;
  row: number;
  kind: BrickKind;
  tone: number;
}

export interface Level {
  sector: number;
  /** Rows the layout spans (the lowest row with a cell, plus one, or more). */
  rows: number;
  cells: LevelCell[];
  /** Rows that swing sideways when the sector has row motion. */
  movingRows: number[];
  /** Every 5th sector: denser, more explosives and prisms. */
  special: boolean;
}

export function isBreakable(kind: BrickKind): boolean {
  return kind !== 'steel';
}

export function breakableCount(level: Level): number {
  let count = 0;
  for (const cell of level.cells) if (isBreakable(cell.kind)) count++;
  return count;
}

function toneForRow(row: number): number {
  return row % TONE_COUNT;
}

/** Reads an ASCII layout. Throws on a malformed map: they are code, a typo should fail loudly. */
export function parseLayout(rows: readonly string[], sector = 0): Level {
  if (rows.length > GRID.MAX_ROWS) throw new Error(`A layout has at most ${GRID.MAX_ROWS} rows, got ${rows.length}`);
  const cells: LevelCell[] = [];
  const movingRows: number[] = [];
  rows.forEach((raw, row) => {
    const line = raw.endsWith(MOVING_MARK) ? raw.slice(0, -1) : raw;
    if (line !== raw) movingRows.push(row);
    if (line.length !== GRID.COLS) throw new Error(`Row ${row} must be ${GRID.COLS} wide: "${raw}"`);
    for (let col = 0; col < GRID.COLS; col++) {
      const char = line[col];
      if (!(char in LEGEND)) throw new Error(`Unknown brick "${char}" in row ${row}: "${raw}"`);
      const kind = LEGEND[char];
      if (kind) cells.push({ col, row, kind, tone: toneForRow(row) });
    }
  });
  return { sector, rows: rows.length, cells, movingRows, special: isSpecialSector(sector) };
}

/**
 * The first sectors that are no boss (the core takes 5 and 10, see
 * bossLayout), by sector number, each drawn in 3 variants. Each sector
 * introduces something: sector 1 is only soft bricks and a few capsules, 2
 * adds tough bricks, 3 explosives, 4 armored and prisms, 6 moving rows and
 * steel, 8 the descending ceiling. Every variant of a sector keeps its brick
 * kinds, its row motion and a hit total within 15% of the first one, so the
 * par time and the curve hold whichever one is drawn. The first variant is
 * the original map. Original shapes, drawn for this game.
 */
export const HANDCRAFTED_SECTORS: Readonly<Partial<Record<number, readonly (readonly string[])[]>>> = {
  1: [
    // Twin clouds: wide gaps, only soft bricks.
    [
      '.............',
      '..111...111..',
      '.11?11.11?11.',
      '..111...111..',
      '.............',
      '1.1.1.1.1.1.1',
    ],
    // Pyramid: a stepped peak with a capsule in its heart.
    [
      '......1......',
      '.....111.....',
      '....11?11....',
      '...1111111...',
      '..111...111..',
      '.............',
      '?1.1.1.1.1.1?',
    ],
    // Smile: two eyes and a grin, soft bricks only.
    [
      '.............',
      '..11.....11..',
      '.1?11...11?1.',
      '..11.....11..',
      '.............',
      '.1.........1.',
      '..111111111..',
    ],
  ],
  2: [
    // Arrowhead: tough bricks on the edges of the chevron.
    [
      '......1......',
      '.....121.....',
      '....12?21....',
      '...121.121...',
      '..121...121..',
      '.121.....121.',
      '.?.........?.',
    ],
    // Diamond: a tough outline around two capsules.
    [
      '......2......',
      '.....212.....',
      '....21?12....',
      '...21...12...',
      '....21?12....',
      '.....212.....',
      '......2......',
      '.?.........?.',
    ],
    // Gates: tough posts over soft ones, two pockets below.
    [
      '.............',
      '.2.2.2.2.2.2.',
      '.1.1.1.1.1.1.',
      '.1.1.1?1.1.1.',
      '.............',
      '..222...222..',
      '..1?1...1?1..',
    ],
  ],
  3: [
    // Honeycomb: a fuse in the middle of each cell.
    [
      '.............',
      '1111.111.1111',
      '1*21.2*2.12*1',
      '1111.111.1111',
      '.............',
      '..?..???..?..',
      '.............',
      '.2222...2222.',
    ],
    // Bunkers: two blocks with a fuse each, a third fuse alone in the gap.
    [
      '.............',
      '..2222.2222..',
      '..1*11.11*1..',
      '..1111.1111..',
      '.............',
      '.?....*....?.',
      '.............',
      '111111.111111',
      '.1?1.....1?1.',
    ],
    // Ladder: tough rungs, three fuses in a row to chain.
    [
      '1.1.1.1.1.1.1',
      '.2.2.2.2.2.2.',
      '1.1.*.*.*.1.1',
      '.2.2.2.2.2.2.',
      '1.1.1.?.1.1.1',
      '.............',
      '..?.......?..',
      '.11111.11111.',
    ],
  ],
  4: [
    // Temple: armored roof, a prism on the spire.
    [
      '......%......',
      '.....333.....',
      '....22222....',
      '...1111111...',
      '..1?.....?1..',
      '..1.......1..',
      '..1.3...3.1..',
      '..111111111..',
    ],
    // Castle: armored towers, prisms in the windows.
    [
      '.3.........3.',
      '.2.........2.',
      '.11111111111.',
      '.1..%...%..1.',
      '.1.?.....?.1.',
      '.1..3...3..1.',
      '.111.....111.',
      '.....222.....',
    ],
    // Eye: an armored iris around a prism pupil.
    [
      '....11111....',
      '..112222211..',
      '.11...3...11.',
      '.1..3?%?3..1.',
      '.11...3...11.',
      '..111111111..',
      '.....111.....',
    ],
  ],
  6: [
    // Pendulum: the first moving rows. The clusters sit clear of the steel
    // corners (over them, the last bricks took a minute of rescue capsules).
    [
      '.............',
      '...1111111...~',
      '.............',
      '..22.....22..',
      '..2?2...2?2..',
      '..22.....22..',
      '.............',
      '..*1111111*..~',
      '.............',
      '##.........##',
    ],
    // Bridges: two swinging rows over a steel pier in the middle.
    [
      '.............',
      '..111111111..~',
      '.............',
      '.22.......22.',
      '.2?2.....2?2.',
      '.22.......22.',
      '.............',
      '....*111*....~',
      '.............',
      '.....###.....',
    ],
    // Funnel: tough walls leading into a pair of steel pegs.
    [
      '2...........2',
      '.2.........2.',
      '..2.......2..',
      '...1111111...~',
      '.............',
      '..1?1...1?1..',
      '..*1#...#1*..',
      '.............',
      '.1111...1111.~',
    ],
  ],
  7: [
    // Lanterns: prisms hung over a steel shield, with lanes 3 cells wide
    // past it (2-cell lanes kept the ball out for 12 s at a time).
    [
      '3.3.3.3.3.3.3',
      '.............',
      '.1%1.1%1.1%1.',
      '.............',
      '2222.....2222~',
      '.............',
      '*?*.*?*?*.*?*',
      '.............',
      '...#######...',
    ],
    // Twin shields: armored crown, three lanes 3 cells wide past the steel.
    [
      '.3.3.3.3.3.3.',
      '1.1.1.1.1.1.1',
      '..%1%...%1%..',
      '.............',
      '.2222...2222.~',
      '.............',
      '.*?*.....*?*.',
      '.............',
      '...##...##...',
    ],
    // Chandelier: an armored lamp over a steel bar, lanes 4 cells wide.
    [
      '......3......',
      '.....3%3.....',
      '....2.2.2....',
      '...1.1.1.1...',
      '.2*2..?..2*2.~',
      '.............',
      '%.1.1.1.1.1.%',
      '.1.1.....1.1.',
      '..3.#####.3..',
      '.?.........?.',
    ],
  ],
  8: [
    // Pressure: the ceiling starts to come down. Tough row on top and
    // armored only around the capsules, so the clear fits its par.
    [
      '2222222222222',
      '1111111111111',
      '.............',
      '..22.....22..',
      '..3?3...3?3..',
      '..22.....22..',
      '.............',
      '*...*...*...*~',
    ],
    // Weights: a tough lid split down the middle.
    [
      '2222.....2222',
      '1111.....1111',
      '....22222....',
      '....11111....',
      '.............',
      '.3?3.....3?3.',
      '1111.....1111',
      '.............',
      '..*...*...*..~',
    ],
    // Zigzag: tough bands that narrow, armor around the capsules.
    [
      '22222...22222',
      '.............',
      '...2222222...',
      '.............',
      '11111...11111',
      '.............',
      '.*.3?3.3?3.*.',
      '.............',
      '..111111111..~',
    ],
  ],
  9: [
    // Lattice: steel studs and a sliding floor.
    [
      '#.#.#.#.#.#.#',
      '.2.2.2.2.2.2.',
      '2.3.3.3.3.3.2',
      '.2.2.%.%.2.2.',
      '1111111111111~',
      '.?.........?.',
    ],
    // Grates: steel posts at the walls and between the columns.
    [
      '.2.2.2.2.2.2.',
      '#.3.3.%.3.3.#',
      '.2.2.2.2.2.2.',
      '1.1.#.1.#.1.1',
      '.............',
      '111111.111111~',
      '..?.......?..',
    ],
    // Pillars: steel cores inside tough columns.
    [
      '1111111111111',
      '.2%2.....2%2.',
      '.2#2..3..2#2.',
      '.2#2.333.2#2.',
      '.....?.?.....',
      '.1.3.....3.1.~',
    ],
  ],
};

/** Salt for the variant roll, so it never follows the procedural generator's stream. */
const VARIANT_SALT = 0x7a12;

/**
 * Which drawn variant of a handcrafted sector a run plays, or null if the
 * sector has none. Each sector rolls on its own: one run can mix them.
 */
export function handcraftedVariant(sector: number, seed: number): number | null {
  const variants = HANDCRAFTED_SECTORS[sector];
  if (!variants || variants.length === 0) return null;
  return mixSeed(seed ^ VARIANT_SALT, sector) % variants.length;
}

/**
 * Rows left empty at the top of a boss arena: the core and its shield ring
 * live there (y 116..206), outside the grid.
 */
export const BOSS_ARENA_EMPTY_ROWS = 6;

const EMPTY_ROW = '.............';

/**
 * The arenas of the boss sectors: under the core, a sparse checkerboard of
 * debris with lanes for the ball, capsules to feed the fight and a few
 * fuses. The sector ends with the core, not with these bricks. The run's
 * seed picks one per boss (see bossArenaIndex).
 */
export const BOSS_ARENAS: readonly (readonly string[])[] = [
  // Debris field: soft, two capsule bricks, two fuses.
  ['1.1.?.1.?.1.1', '.2.1.1.1.1.2.', '1.*.1.%.1.*.1'],
  // Wings: soft, a clear lane down the middle to the core, fuses on the flanks.
  ['1.?.1...1.?.1', '.1.1.1.1.1.1.', '2.*.1...1.*.2', '.1.........1.'],
  // Scrapyard: tougher, two steel studs and a swinging floor.
  ['2.2.?.3.?.2.2', '.1.2.%.%.2.1.', '*.1.#.2.#.1.*', '.1.1.1.1.1.1.~'],
  // Turrets: an armored brick under the core, steel studs and a swinging floor.
  ['?.2.1.3.1.2.?', '.1.#.1.1.#.1.', '2.*.2...2.*.2', '.1.1.1.1.1.1.~'],
];

/** Arenas the first boss (sector 5) can draw: no steel and nothing moving, both arrive at sector 6. */
export const FIRST_BOSS_ARENAS: readonly number[] = [0, 1];

/** Arenas the second boss (sector 10) can draw: steel and a swinging floor, the step up. */
export const SECOND_BOSS_ARENAS: readonly number[] = [2, 3];

/** Salt for the arena roll, so it follows neither the variant roll nor the generator. */
const ARENA_SALT = 0xa7e4;

/**
 * Which arena of BOSS_ARENAS a boss sector plays, or null for any other
 * sector. The first boss draws a gentle one, the second a steel one; from
 * the third on any arena but the one the previous boss used, so a run
 * never fights twice in a row on the same floor.
 */
export function bossArenaIndex(sector: number, seed: number): number | null {
  if (!isSpecialSector(sector)) return null;
  const number = Math.floor(sector / 5);
  let previous = -1;
  for (let n = 1; n <= number; n++) {
    const pool =
      n === 1 ? FIRST_BOSS_ARENAS : n === 2 ? SECOND_BOSS_ARENAS : BOSS_ARENAS.map((_, i) => i).filter((i) => i !== previous);
    previous = pool[mixSeed(seed ^ ARENA_SALT, n) % pool.length];
  }
  return previous;
}

/** The layout of a boss sector (every 5th) for a run's seed, or null for any other sector. */
export function bossLayout(sector: number, seed: number): readonly string[] | null {
  const index = bossArenaIndex(sector, seed);
  if (index === null) return null;
  const rows: string[] = [];
  for (let i = 0; i < BOSS_ARENA_EMPTY_ROWS; i++) rows.push(EMPTY_ROW);
  return rows.concat(BOSS_ARENAS[index]);
}

/**
 * The level of a sector: a boss arena (picked by the seed), one of the
 * drawn variants up to 9 (picked by the seed), generated from the seed after.
 */
export function buildLevel(sector: number, seed: number): Level {
  const boss = bossLayout(sector, seed);
  if (boss) return parseLayout(boss, sector);
  const variant = handcraftedVariant(sector, seed);
  if (variant !== null) return parseLayout(HANDCRAFTED_SECTORS[sector]![variant], sector);
  return generateLevel(sector, seed);
}

// ---------------------------------------------------------------- procedural

const MIN_BREAKABLE = 24;
const MAX_STEEL_SHARE = 0.35;
const CENTER = (GRID.COLS - 1) / 2;
/** A row is a stripe of one of these... */
const STRUCTURAL: readonly BrickKind[] = ['normal', 'tough', 'armored'];
/** ...sprinkled cell by cell with these, so a rare kind never fills a whole row. */
const SPRINKLES: readonly BrickKind[] = ['steel', 'explosive', 'capsule', 'prism'];

type Grid = (BrickKind | null)[][];

function mirror(col: number): number {
  return GRID.COLS - 1 - col;
}

function setPair(grid: Grid, row: number, col: number, kind: BrickKind | null): void {
  grid[row][col] = kind;
  grid[row][mirror(col)] = kind;
}

/** The stripe kind of a row, by the weights of the structural kinds alone. */
function pickRowKind(mix: BrickMix, rng: Rng): BrickKind {
  const total = mix.normal + mix.tough + mix.armored;
  let roll = rng.next() * total;
  for (const kind of STRUCTURAL) {
    roll -= mix[kind];
    if (roll < 0) return kind;
  }
  return 'normal';
}

/** A cell: a sprinkle at its own weight, otherwise the row's stripe kind. */
function pickCellKind(mix: BrickMix, rowKind: BrickKind, rng: Rng): BrickKind {
  let roll = rng.next();
  for (const kind of SPRINKLES) {
    roll -= mix[kind];
    if (roll < 0) return kind;
  }
  return rowKind;
}

/** Special sectors double the explosives and prisms, taken from the normal share. */
function specialMix(mix: BrickMix): BrickMix {
  const extra = mix.explosive + mix.prism;
  return { ...mix, explosive: mix.explosive * 2, prism: mix.prism * 2, normal: Math.max(0, mix.normal - extra) };
}

/** Which cells of the left half (cols 0..6) a row fills, by a few row styles. */
function rowShape(style: number, row: number, rng: Rng): boolean[] {
  const half: boolean[] = [];
  for (let col = 0; col <= CENTER; col++) {
    switch (style) {
      case 0: // solid
        half.push(true);
        break;
      case 1: // checker, shifting every row
        half.push((col + row) % 2 === 0);
        break;
      case 2: // blocks of two with a gap
        half.push(col % 3 !== 2);
        break;
      case 3: // open edges, solid middle
        half.push(col >= 2);
        break;
      default: // scattered
        half.push(rng.chance(0.55));
    }
  }
  return half;
}

/**
 * Breakable cells no path from below can reach without crossing steel.
 * The ball comes from the open bottom; a breakable brick is a door (it can
 * be broken), steel is a wall. Returned as [row, col] pairs.
 */
export function unreachableBreakables(level: Level): [number, number][] {
  const grid = toGrid(level);
  const reached = reachFromBelow(grid);
  const out: [number, number][] = [];
  for (const cell of level.cells) {
    if (isBreakable(cell.kind) && !reached[cell.row][cell.col]) out.push([cell.row, cell.col]);
  }
  return out;
}

function toGrid(level: Level): Grid {
  const grid: Grid = Array.from({ length: level.rows }, () => Array<BrickKind | null>(GRID.COLS).fill(null));
  for (const cell of level.cells) grid[cell.row][cell.col] = cell.kind;
  return grid;
}

function reachFromBelow(grid: Grid): boolean[][] {
  const rows = grid.length;
  const reached = grid.map((row) => row.map(() => false));
  const queue: [number, number][] = [];
  if (rows === 0) return reached;
  for (let col = 0; col < GRID.COLS; col++) {
    if (grid[rows - 1][col] !== 'steel') {
      reached[rows - 1][col] = true;
      queue.push([rows - 1, col]);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const [row, col] = queue[i];
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= rows || c < 0 || c >= GRID.COLS || reached[r][c] || grid[r][c] === 'steel') continue;
      reached[r][c] = true;
      queue.push([r, c]);
    }
  }
  return reached;
}

/**
 * A sector past the handcrafted ones. Same seed and sector, same layout.
 * It is mirrored on the vertical axis, so it always looks designed, and it
 * is checked after being drawn: no full steel row, at most 35% steel, no
 * breakable brick sealed behind steel, and at least 24 breakable bricks.
 */
export function generateLevel(sector: number, seed: number): Level {
  const rng = new Rng(mixSeed(seed, sector));
  const params = sectorParams(sector);
  const special = isSpecialSector(sector);
  const mix = special ? specialMix(params.brickMix) : params.brickMix;

  const baseRows = Math.min(11, 7 + Math.floor(Math.max(0, sector - 11) / 4));
  const rows = Math.min(GRID.MAX_ROWS, baseRows + (special ? 2 : 0));
  const grid: Grid = Array.from({ length: rows }, () => Array<BrickKind | null>(GRID.COLS).fill(null));

  for (let row = 0; row < rows; row++) {
    // A breathing row now and then gives the ball a lane to run along;
    // special sectors skip them, they are meant to be packed.
    if (!special && row > 0 && row < rows - 1 && rng.chance(0.18)) continue;
    const style = special && rng.chance(0.5) ? 0 : rng.int(0, 4);
    const shape = rowShape(style, row, rng);
    // A row is one kind with a few specials in it: it reads as a stripe, not confetti.
    const rowKind = pickRowKind(mix, rng);
    for (let col = 0; col <= CENTER; col++) {
      if (shape[col]) setPair(grid, row, col, pickCellKind(mix, rowKind, rng));
    }
  }

  enforceRules(grid);

  const level: Level = { sector, rows, cells: [], movingRows: [], special };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < GRID.COLS; col++) {
      const kind = grid[row][col];
      if (kind) level.cells.push({ col, row, kind, tone: toneForRow(row) });
    }
  }
  level.movingRows = pickMovingRows(grid, params.rowMotionAmplitude > 0, rng);
  return level;
}

function enforceRules(grid: Grid): void {
  const rows = grid.length;

  // No row of steel alone: a row with no breakable brick and steel in it
  // gets its steel broken up, center first.
  for (let row = 0; row < rows; row++) {
    const cells = grid[row];
    const steel = cells.filter((k) => k === 'steel').length;
    const breakable = cells.filter((k) => k !== null && k !== 'steel').length;
    if (steel > 0 && (breakable === 0 || steel > 9)) {
      for (let col = CENTER; col >= 0; col -= 2) if (grid[row][col] === 'steel') setPair(grid, row, col, 'tough');
    }
  }

  // At most 35% steel, the extra turned into tough bricks from the top.
  const count = () => {
    let total = 0;
    let steel = 0;
    for (const line of grid)
      for (const kind of line) {
        if (kind) total++;
        if (kind === 'steel') steel++;
      }
    return { total, steel };
  };
  outer: for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= CENTER; col++) {
      const { total, steel } = count();
      if (steel <= Math.floor(total * MAX_STEEL_SHARE)) break outer;
      if (grid[row][col] === 'steel') setPair(grid, row, col, 'tough');
    }
  }

  // Nothing breakable sealed behind steel: open the lowest steel cell under
  // each sealed brick until every one is reachable from below.
  for (let guard = 0; guard < rows * GRID.COLS; guard++) {
    const reached = reachFromBelow(grid);
    let sealed: [number, number] | null = null;
    for (let row = rows - 1; row >= 0 && !sealed; row--) {
      for (let col = 0; col < GRID.COLS; col++) {
        const kind = grid[row][col];
        if (kind && kind !== 'steel' && !reached[row][col]) {
          sealed = [row, col];
          break;
        }
      }
    }
    if (!sealed) break;
    const [row, col] = sealed;
    let opened = false;
    for (let r = row + 1; r < rows; r++) {
      if (grid[r][col] === 'steel') {
        setPair(grid, r, col, 'normal');
        opened = true;
        break;
      }
    }
    // Some steel is always below a sealed brick (the bottom row is open), so
    // each pass removes one; the guard is only a safety net.
    if (!opened) break;
  }

  // At least 24 breakable bricks: fill empty cells with normal ones, top down.
  let breakable = 0;
  for (const line of grid) for (const kind of line) if (kind && kind !== 'steel') breakable++;
  for (let row = 0; row < rows && breakable < MIN_BREAKABLE; row++) {
    for (let col = CENTER; col >= 0 && breakable < MIN_BREAKABLE; col--) {
      if (grid[row][col] !== null) continue;
      setPair(grid, row, col, 'normal');
      breakable += col === CENTER ? 1 : 2;
    }
  }
}

/**
 * Rows that swing. A row with room at its ends swings wider, so those are
 * preferred; about a third of the rows move, at least one.
 */
function pickMovingRows(grid: Grid, enabled: boolean, rng: Rng): number[] {
  if (!enabled) return [];
  const filled: number[] = [];
  for (let row = 0; row < grid.length; row++) if (grid[row].some((k) => k !== null)) filled.push(row);
  const moving = filled.filter((row) => grid[row][0] === null && rng.chance(0.5));
  for (const row of filled) {
    if (moving.length >= Math.max(1, Math.ceil(filled.length / 3))) break;
    if (!moving.includes(row) && rng.chance(0.35)) moving.push(row);
  }
  if (moving.length === 0 && filled.length > 0) moving.push(filled[filled.length - 1]);
  return moving.sort((a, b) => a - b).slice(0, Math.max(1, Math.ceil(filled.length / 2)));
}
