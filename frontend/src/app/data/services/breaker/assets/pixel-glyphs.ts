import type { PowerUpKind } from '../engine/types';

/**
 * Pixel icons for capsules, HUD effect icons and the capsule brick, on a 7x7 grid.
 * They are painted cell by cell with fillRect, so they are crisp at any scale and do not
 * wait for a web font to load. `#` is a lit cell.
 */
export const GLYPH_SIZE = 7;

export type Glyph = readonly string[];

export const PIXEL_GLYPHS: Readonly<Record<PowerUpKind, Glyph>> = {
  // Three balls.
  multi: ['...#...', '..###..', '...#...', '.......', '.#...#.', '###.###', '.#...#.'],
  // Double arrow: wider.
  wide: ['.......', '.#...#.', '##...##', '#######', '##...##', '.#...#.', '.......'],
  // Twin arrow-tipped beams over a paddle.
  laser: ['.#...#.', '###.###', '.#...#.', '.#...#.', '.#...#.', '.......', '#######'],
  // Horseshoe magnet.
  magnet: ['##...##', '##...##', '##...##', '##...##', '##...##', '.#####.', '..###..'],
  // Hourglass.
  slow: ['#######', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#######'],
  // Flame.
  fire: ['..#....', '..##...', '.####.#', '.######', '###.###', '##...##', '.#####.'],
  // Shield.
  barrier: ['#######', '#######', '##...##', '##...##', '.##.##.', '..###..', '...#...'],
  // Heart.
  life: ['.......', '.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  // Star.
  nova: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
  // Arrows pointing in: smaller.
  shrink: ['.......', '#.....#', '##...##', '###.###', '##...##', '#.....#', '.......'],
  // Double chevron: faster.
  fast: ['#..#...', '.#..#..', '..#..#.', '...#..#', '..#..#.', '.#..#..', '#..#...'],
};

export const QUESTION_GLYPH: Glyph = ['.#####.', '##...##', '.....##', '...###.', '...##..', '.......', '...##..'];

export interface GlyphCell {
  col: number;
  row: number;
}

export function glyphCells(glyph: Glyph): GlyphCell[] {
  const cells: GlyphCell[] = [];
  glyph.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      if (line[col] === '#') {
        cells.push({ col, row });
      }
    }
  });
  return cells;
}
