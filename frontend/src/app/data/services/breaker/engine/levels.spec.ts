import { BREAKER_THEME_COUNT, BREAKER_TONE_COUNT } from '@app/data/models/breaker/BreakerKeys';
import { BOSS, BRICK_HP, GRID } from './config';
import {
  BOSS_ARENA_EMPTY_ROWS,
  BOSS_ARENAS,
  bossArenaIndex,
  bossLayout,
  FIRST_BOSS_ARENAS,
  SECOND_BOSS_ARENAS,
  breakableCount,
  buildLevel,
  generateLevel,
  HANDCRAFTED_SECTORS,
  isBreakable,
  parseLayout,
  THEME_COUNT,
  themeForSector,
  TONE_COUNT,
  unreachableBreakables,
  type Level,
} from './levels';

/** The level as a grid of chars again, to compare shapes. */
function toAscii(level: Level): string[] {
  const rows = Array.from({ length: level.rows }, () => Array<string>(GRID.COLS).fill('.'));
  const chars: Record<string, string> = {
    normal: '1',
    tough: '2',
    armored: '3',
    steel: '#',
    explosive: '*',
    capsule: '?',
    prism: '%',
  };
  for (const cell of level.cells) rows[cell.row][cell.col] = chars[cell.kind];
  return rows.map((r) => r.join(''));
}

describe('breaker levels', () => {
  describe('parseLayout', () => {
    it('reads every legend char into a brick with its row and column', () => {
      const level = parseLayout(['1.2.3.#.*.?.%', '.............']);
      expect(level.rows).toBe(2);
      expect(level.cells.map((c) => [c.col, c.row, c.kind])).toEqual([
        [0, 0, 'normal'],
        [2, 0, 'tough'],
        [4, 0, 'armored'],
        [6, 0, 'steel'],
        [8, 0, 'explosive'],
        [10, 0, 'capsule'],
        [12, 0, 'prism'],
      ]);
    });

    it('reads a trailing ~ as a moving row', () => {
      const level = parseLayout(['.............', '...1111111...~']);
      expect(level.movingRows).toEqual([1]);
      expect(level.cells.length).toBe(7);
    });

    it('gives each row band its own tone, 0 to 7, so rows read as stripes', () => {
      const level = parseLayout(Array.from({ length: 10 }, () => '1111111111111'));
      for (const cell of level.cells) {
        expect(cell.tone).toBeGreaterThanOrEqual(0);
        expect(cell.tone).toBeLessThan(8);
        expect(cell.tone).toBe(level.cells.find((c) => c.row === cell.row)!.tone);
      }
      expect(new Set(level.cells.map((c) => c.tone)).size).toBeGreaterThan(3);
    });

    it('refuses a row that is not 13 wide, a bad char, or too many rows', () => {
      expect(() => parseLayout(['111'])).toThrowError(/13/);
      expect(() => parseLayout(['1111111x11111'])).toThrowError(/x/);
      expect(() => parseLayout(Array.from({ length: 15 }, () => '.............'))).toThrowError(/14/);
    });
  });

  describe('handcrafted sectors', () => {
    /** Every drawn variant of every handcrafted sector, parsed, with a label for failures. */
    function everyVariant(): { at: string; sector: number; level: Level }[] {
      const out: { at: string; sector: number; level: Level }[] = [];
      for (const [key, variants] of Object.entries(HANDCRAFTED_SECTORS)) {
        const sector = Number(key);
        variants!.forEach((rows, i) => out.push({ at: `sector ${sector} variant ${i}`, sector, level: parseLayout(rows, sector) }));
      }
      return out;
    }

    function hitPoints(level: Level): number {
      return level.cells.filter((c) => isBreakable(c.kind)).reduce((sum, c) => sum + BRICK_HP[c.kind], 0);
    }

    it('draws 2 or 3 variants of sectors 1 to 9 but the boss sector 5, all 13 wide, within 14 rows, all valid', () => {
      // The core takes 5 and 10: a layout drawn for them would never be played.
      expect(Object.keys(HANDCRAFTED_SECTORS).map(Number)).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
      for (const [sector, variants] of Object.entries(HANDCRAFTED_SECTORS)) {
        expect(variants!.length).withContext(`sector ${sector}`).toBeGreaterThanOrEqual(2);
        expect(variants!.length).withContext(`sector ${sector}`).toBeLessThanOrEqual(3);
        variants!.forEach((rows, i) => {
          expect(rows.length).withContext(`sector ${sector} variant ${i}`).toBeLessThanOrEqual(GRID.MAX_ROWS);
          for (const row of rows) expect(row.replace(/~$/, '').length).withContext(`sector ${sector} variant ${i}: ${row}`).toBe(13);
          expect(() => parseLayout(rows)).not.toThrow();
        });
      }
    });

    it('makes every variant of sector 1 very easy: only normal and capsule bricks, few rows', () => {
      for (const { at, sector, level } of everyVariant()) {
        if (sector !== 1) continue;
        expect(level.cells.every((c) => c.kind === 'normal' || c.kind === 'capsule')).withContext(at).toBeTrue();
        expect(level.cells.filter((c) => c.kind === 'capsule').length).withContext(at).toBeGreaterThan(0);
        expect(level.cells.filter((c) => c.kind === 'capsule').length).withContext(at).toBeLessThanOrEqual(4);
        expect(level.rows).withContext(at).toBeLessThanOrEqual(7);
        expect(level.movingRows).withContext(at).toEqual([]);
      }
    });

    it('picks the variant from the seed: the same seed builds the same map, and every variant gets played', () => {
      for (const [key, variants] of Object.entries(HANDCRAFTED_SECTORS)) {
        const sector = Number(key);
        const drawn = variants!.map((rows) => toAscii(parseLayout(rows, sector)).join('\n'));
        const seen = new Set<string>();
        for (let seed = 1; seed <= 60; seed++) {
          const shape = toAscii(buildLevel(sector, seed)).join('\n');
          expect(shape).withContext(`sector ${sector} seed ${seed}`).toEqual(toAscii(buildLevel(sector, seed)).join('\n'));
          expect(drawn).withContext(`sector ${sector} seed ${seed}`).toContain(shape);
          seen.add(shape);
        }
        expect(seen.size).withContext(`sector ${sector}`).toBe(variants!.length);
      }
    });

    it('rolls each sector on its own, so one run mixes variants', () => {
      // If every sector rolled the same index, a run would be "all A" or "all B".
      let mixed = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const picks = [1, 2, 3, 4].map((s) => {
          const shape = toAscii(buildLevel(s, seed)).join('\n');
          return HANDCRAFTED_SECTORS[s]!.findIndex((rows) => toAscii(parseLayout(rows, s)).join('\n') === shape);
        });
        if (new Set(picks).size > 1) mixed++;
      }
      expect(mixed).toBeGreaterThan(20);
    });

    it('keeps each variant true to its sector: same brick kinds, same row motion, a hit total within 15%', () => {
      for (const [key, variants] of Object.entries(HANDCRAFTED_SECTORS)) {
        const sector = Number(key);
        const base = parseLayout(variants![0], sector);
        const baseKinds = [...new Set(base.cells.map((c) => c.kind))].sort();
        variants!.forEach((rows, i) => {
          const at = `sector ${sector} variant ${i}`;
          const level = parseLayout(rows, sector);
          expect([...new Set(level.cells.map((c) => c.kind))].sort()).withContext(at).toEqual(baseKinds);
          expect(level.movingRows.length > 0).withContext(at).toBe(base.movingRows.length > 0);
          expect(Math.abs(hitPoints(level) - hitPoints(base))).withContext(at).toBeLessThanOrEqual(hitPoints(base) * 0.15);
        });
      }
    });

    it('draws every variant mirrored on the vertical axis', () => {
      for (const { at, level } of everyVariant()) {
        for (const row of toAscii(level)) expect(row).withContext(at).toBe(row.split('').reverse().join(''));
      }
    });

    it('leaves every breakable brick reachable from below and has enough of them', () => {
      for (const { at, level } of everyVariant()) {
        expect(unreachableBreakables(level)).withContext(at).toEqual([]);
        expect(breakableCount(level)).withContext(at).toBeGreaterThanOrEqual(20);
      }
      for (const s of [5, 10]) {
        const level = buildLevel(s, 1);
        expect(unreachableBreakables(level)).withContext(`sector ${s}`).toEqual([]);
        expect(breakableCount(level)).withContext(`sector ${s}`).toBeGreaterThanOrEqual(20);
      }
    });

    it('leaves wide lanes past steel in every variant (a bot stalled 60 s on bricks steel hid)', () => {
      for (const { at, level } of everyVariant()) {
        const steel = level.cells.filter((c) => c.kind === 'steel');
        for (let row = 0; row < level.rows; row++) {
          expect(steel.filter((c) => c.row === row).length).withContext(`${at} row ${row}`).toBeLessThanOrEqual(7);
        }
        // Next to a wall a brick over steel is reached only by a rare shallow bounce.
        const cornered = level.cells.filter(
          (c) => isBreakable(c.kind) && (c.col <= 1 || c.col >= 11) && steel.some((k) => k.col === c.col && k.row > c.row)
        );
        expect(cornered.map((c) => `${c.col},${c.row}`)).withContext(at).toEqual([]);
      }
    });

    it('moves rows only from sector 6 on', () => {
      for (const { at, sector, level } of everyVariant()) {
        if (sector < 6) expect(level.movingRows).withContext(at).toEqual([]);
        else expect(level.movingRows.length).withContext(at).toBeGreaterThan(0);
      }
      expect(buildLevel(5, 1).movingRows).toEqual([]);
      expect(buildLevel(10, 1).movingRows.length).toBeGreaterThan(0);
    });

    it('makes sectors 5 and 10 special', () => {
      expect(buildLevel(5, 1).special).toBeTrue();
      expect(buildLevel(10, 1).special).toBeTrue();
      expect(buildLevel(4, 1).special).toBeFalse();
    });
  });

  describe('boss arenas', () => {
    const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
    const hasSteel = (rows: readonly string[]) => rows.some((r) => r.includes('#'));
    const hasMotion = (rows: readonly string[]) => rows.some((r) => r.endsWith('~'));

    it('draws at least 4 arenas: 2 gentle ones for the first boss, 2 with steel and a swinging row for the second', () => {
      expect(BOSS_ARENAS.length).toBeGreaterThanOrEqual(4);
      expect(FIRST_BOSS_ARENAS.length).toBeGreaterThanOrEqual(2);
      expect(SECOND_BOSS_ARENAS.length).toBeGreaterThanOrEqual(2);
      // Steel and moving rows arrive at sector 6: the first boss (sector 5) has neither.
      for (const i of FIRST_BOSS_ARENAS) {
        expect(hasSteel(BOSS_ARENAS[i])).withContext(`arena ${i}`).toBeFalse();
        expect(hasMotion(BOSS_ARENAS[i])).withContext(`arena ${i}`).toBeFalse();
      }
      for (const i of SECOND_BOSS_ARENAS) {
        expect(hasSteel(BOSS_ARENAS[i])).withContext(`arena ${i}`).toBeTrue();
        expect(hasMotion(BOSS_ARENAS[i])).withContext(`arena ${i}`).toBeTrue();
      }
    });

    it('gives every 5th sector an arena layout, and no other sector', () => {
      for (const s of [5, 10, 15, 20, 25]) expect(bossLayout(s, 1)).withContext(`sector ${s}`).not.toBeNull();
      for (const s of [1, 4, 6, 9, 11, 14, 16]) expect(bossLayout(s, 1)).withContext(`sector ${s}`).toBeNull();
      for (const s of [1, 4, 6, 11]) expect(bossArenaIndex(s, 1)).withContext(`sector ${s}`).toBeNull();
    });

    it('builds the arena the seed picks, the same one for the same seed', () => {
      for (const seed of SEEDS) {
        for (const s of [5, 10, 15, 20]) {
          const arena = BOSS_ARENAS[bossArenaIndex(s, seed)!];
          const expected = toAscii(parseLayout(bossLayout(s, seed)!, s));
          expect(toAscii(buildLevel(s, seed))).withContext(`sector ${s} seed ${seed}`).toEqual(expected);
          expect(toAscii(buildLevel(s, seed))).withContext(`sector ${s} seed ${seed}`).toEqual(toAscii(buildLevel(s, seed)));
          expect(expected.slice(BOSS_ARENA_EMPTY_ROWS)).withContext(`sector ${s} seed ${seed}`).toEqual(
            arena.map((r) => r.replace(/~$/, ''))
          );
        }
      }
    });

    it('opens with a gentle arena at sector 5, a steel one at 10, then any arena but the one just fought', () => {
      for (const seed of SEEDS) {
        expect(FIRST_BOSS_ARENAS).withContext(`seed ${seed}`).toContain(bossArenaIndex(5, seed)!);
        expect(SECOND_BOSS_ARENAS).withContext(`seed ${seed}`).toContain(bossArenaIndex(10, seed)!);
        for (let n = 2; n <= 12; n++) {
          expect(bossArenaIndex(n * 5, seed)).withContext(`boss ${n} seed ${seed}`).not.toBe(bossArenaIndex((n - 1) * 5, seed));
        }
      }
    });

    it('lets runs meet every arena: both of each opening pool, and all of them later on', () => {
      const first = new Set(SEEDS.map((seed) => bossArenaIndex(5, seed)));
      const second = new Set(SEEDS.map((seed) => bossArenaIndex(10, seed)));
      const later = new Set(SEEDS.flatMap((seed) => [15, 20, 25, 30].map((s) => bossArenaIndex(s, seed))));
      expect(first.size).toBe(FIRST_BOSS_ARENAS.length);
      expect(second.size).toBe(SECOND_BOSS_ARENAS.length);
      expect(later.size).toBe(BOSS_ARENAS.length);
    });

    it('draws every arena fair: mirrored, reachable, 20+ bricks with capsules and a fuse, wide lanes past steel', () => {
      BOSS_ARENAS.forEach((rows, i) => {
        const at = `arena ${i}`;
        const level = parseLayout(rows, 5);
        expect(BOSS_ARENA_EMPTY_ROWS + rows.length).withContext(at).toBeLessThanOrEqual(GRID.MAX_ROWS);
        for (const row of toAscii(level)) expect(row).withContext(at).toBe(row.split('').reverse().join(''));
        expect(unreachableBreakables(level)).withContext(at).toEqual([]);
        expect(breakableCount(level)).withContext(at).toBeGreaterThanOrEqual(20);
        // Capsules feed the fight; a fuse is the other way to hurt the core.
        expect(level.cells.filter((c) => c.kind === 'capsule').length).withContext(at).toBeGreaterThanOrEqual(2);
        expect(level.cells.filter((c) => c.kind === 'explosive').length).withContext(at).toBeGreaterThanOrEqual(1);
        const steel = level.cells.filter((c) => c.kind === 'steel');
        for (let row = 0; row < level.rows; row++) {
          expect(steel.filter((c) => c.row === row).length).withContext(`${at} row ${row}`).toBeLessThanOrEqual(7);
        }
        const cornered = level.cells.filter(
          (c) => isBreakable(c.kind) && (c.col <= 1 || c.col >= 11) && steel.some((k) => k.col === c.col && k.row > c.row)
        );
        expect(cornered.map((c) => `${c.col},${c.row}`)).withContext(at).toEqual([]);
      });
    });

    it('keeps arenas of the same pool within 15% of hits of each other', () => {
      for (const pool of [FIRST_BOSS_ARENAS, SECOND_BOSS_ARENAS]) {
        const hits = pool.map((i) =>
          parseLayout(BOSS_ARENAS[i], 5)
            .cells.filter((c) => isBreakable(c.kind))
            .reduce((sum, c) => sum + BRICK_HP[c.kind], 0)
        );
        for (const h of hits) expect(Math.abs(h - hits[0])).withContext(`pool ${pool}`).toBeLessThanOrEqual(hits[0] * 0.15);
      }
    });

    it('keeps the top of the arena empty for the core and its shield', () => {
      for (const seed of SEEDS) {
        for (const s of [5, 10, 15, 20]) {
          const level = buildLevel(s, seed);
          const at = `sector ${s} seed ${seed}`;
          const firstY = Math.min(...level.cells.map((c) => GRID.TOP + c.row * GRID.STRIDE_Y));
          expect(level.cells.every((c) => c.row >= BOSS_ARENA_EMPTY_ROWS)).withContext(at).toBeTrue();
          // The lowest shield brick sits at BOSS.Y + 64 + 26: the debris starts well under it.
          expect(firstY).withContext(at).toBeGreaterThan(BOSS.Y + 64 + GRID.BRICK_H + 40);
        }
      }
    });
  });

  describe('procedural sectors (11 on)', () => {
    const SEEDS = [1, 2, 3, 42, 777, 9001, 123456];
    const SECTORS = [11, 12, 13, 14, 15, 17, 20, 25, 30, 40, 50];

    it('is deterministic for a seed and changes with it', () => {
      expect(toAscii(generateLevel(12, 42))).toEqual(toAscii(generateLevel(12, 42)));
      expect(toAscii(buildLevel(12, 42))).toEqual(toAscii(generateLevel(12, 42)));
      const shapes = new Set(SEEDS.map((seed) => toAscii(generateLevel(12, seed)).join('\n')));
      expect(shapes.size).toBeGreaterThan(SEEDS.length - 2);
    });

    it('is symmetric on the vertical axis', () => {
      for (const seed of SEEDS) {
        for (const s of SECTORS) {
          for (const row of toAscii(generateLevel(s, seed))) {
            expect(row).withContext(`sector ${s} seed ${seed}`).toBe(row.split('').reverse().join(''));
          }
        }
      }
    });

    it('has at least 24 breakable bricks, at most 35% steel and never a full steel row', () => {
      for (const seed of SEEDS) {
        for (const s of SECTORS) {
          const level = generateLevel(s, seed);
          const at = `sector ${s} seed ${seed}`;
          expect(breakableCount(level)).withContext(at).toBeGreaterThanOrEqual(24);
          const steel = level.cells.filter((c) => c.kind === 'steel').length;
          expect(steel).withContext(at).toBeLessThanOrEqual(Math.floor(level.cells.length * 0.35));
          for (const row of toAscii(level)) expect(row).withContext(at).not.toBe('#############');
          expect(level.rows).withContext(at).toBeLessThanOrEqual(GRID.MAX_ROWS);
        }
      }
    });

    it('never walls breakable bricks off from the bottom with steel', () => {
      for (const seed of SEEDS) {
        for (const s of SECTORS) {
          expect(unreachableBreakables(generateLevel(s, seed))).withContext(`sector ${s} seed ${seed}`).toEqual([]);
        }
      }
    });

    it('moves some rows, since every procedural sector is past sector 6', () => {
      for (const seed of SEEDS) expect(generateLevel(11, seed).movingRows.length).toBeGreaterThan(0);
    });

    it('makes every 5th sector denser and richer in explosives and prisms', () => {
      let special = 0;
      let plain = 0;
      let specialBoom = 0;
      let plainBoom = 0;
      for (const seed of SEEDS) {
        for (const [s, isSpecial] of [
          [15, true],
          [14, false],
          [20, true],
          [19, false],
        ] as const) {
          const level = generateLevel(s, seed);
          expect(level.special).toBe(isSpecial);
          const boom = level.cells.filter((c) => c.kind === 'explosive' || c.kind === 'prism').length;
          if (isSpecial) {
            special += level.cells.length;
            specialBoom += boom;
          } else {
            plain += level.cells.length;
            plainBoom += boom;
          }
        }
      }
      expect(special).toBeGreaterThan(plain);
      expect(specialBoom).toBeGreaterThan(plainBoom);
    });
  });

  describe('themes', () => {
    it('knows as many themes and tones as the textures do', () => {
      expect(THEME_COUNT).toBe(BREAKER_THEME_COUNT);
      expect(TONE_COUNT).toBe(BREAKER_TONE_COUNT);
    });

    it('cycles a theme per sector', () => {
      expect(themeForSector(1)).toBe(0);
      expect(themeForSector(2)).toBe(1);
      expect(themeForSector(1 + THEME_COUNT)).toBe(0);
      for (let s = 1; s <= 40; s++) {
        expect(themeForSector(s)).toBeGreaterThanOrEqual(0);
        expect(themeForSector(s)).toBeLessThan(THEME_COUNT);
      }
    });
  });

  it('counts steel as not breakable', () => {
    expect(isBreakable('steel')).toBeFalse();
    expect(isBreakable('armored')).toBeTrue();
    expect(breakableCount(parseLayout(['#1#1#........']))).toBe(2);
  });
});
