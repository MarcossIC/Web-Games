import * as Phaser from 'phaser';
import { hexToNumber } from '../assets/color';
import { CSS, FONT } from './scene-kit';

/**
 * Bitmap fonts baked at boot from the web fonts, so no text on screen ever
 * re-renders a canvas and re-uploads it as a WebGL texture while playing.
 *
 * Why: every `setText` on a `Phaser.GameObjects.Text` repaints its canvas
 * and calls `texImage2D`. On a software WebGL (ANGLE over the Microsoft
 * Basic Render Driver) that upload sometimes waits for the whole pending
 * render: frames of 100-1400 ms. A `BitmapText` only re-lays quads over one
 * atlas that was uploaded once.
 *
 * Each font is drawn white with a dark outline, at about twice the size it
 * is shown (like Text's `resolution: 2`), and `setTint` colors it. The data
 * object is the shape Phaser 4's `ParseXMLBitmapFont` builds (V flipped:
 * `v0 = 1 - y / height`, as `Frame.updateUVs` does), registered in
 * `cache.bitmapFont` as `{ data, texture, frame, fromAtlas }`.
 */

/**
 * phaser.d.ts leaves `xAdvance` out of BitmapFontCharacterData, yet
 * GetBitmapTextSize and both renderers read it (ParseXMLBitmapFont sets it).
 */
export type CharData = Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData & { xAdvance: number };
type FontData = Phaser.Types.GameObjects.BitmapText.BitmapFontData;

/** ASCII 32..126, then the middle dot and the multiplication sign. */
export function glyphList(): string[] {
  const out: string[] = [];
  for (let code = 32; code <= 126; code++) out.push(String.fromCharCode(code));
  out.push('·', '×');
  return out;
}

/** The string Phaser's Text measures its line box with (TextStyle.testString). */
export const LINE_TEST = '|MÉqgy';

export interface BitmapFontSpec {
  key: string;
  family: string;
  /** Size the glyphs are drawn at, in px. */
  bakeSize: number;
  /** Dark outline outside the glyph, in baked px. */
  outline: number;
}

/**
 * The sizes the game shows, merged: Silkscreen 10-13 and 16-18 (floaters go
 * up to 2x), Audiowide 18-22, 28 and the 56 px banner.
 */
export const BITMAP_FONTS: readonly BitmapFontSpec[] = [
  { key: 'breaker-bmf-pixel-s', family: FONT.PIXEL, bakeSize: 24, outline: 2 },
  { key: 'breaker-bmf-pixel-l', family: FONT.PIXEL, bakeSize: 36, outline: 3 },
  { key: 'breaker-bmf-display-s', family: FONT.DISPLAY, bakeSize: 42, outline: 3 },
  { key: 'breaker-bmf-display-m', family: FONT.DISPLAY, bakeSize: 56, outline: 4 },
  { key: 'breaker-bmf-display-l', family: FONT.DISPLAY, bakeSize: 112, outline: 6 },
];

/** The baked font closest to twice `size` (log distance) in that family. */
export function pickBitmapFont(family: string, size: number, fonts: readonly BitmapFontSpec[] = BITMAP_FONTS): BitmapFontSpec {
  let best: BitmapFontSpec | null = null;
  let bestDistance = Infinity;
  const target = 2 * Math.max(1, size);
  for (const spec of fonts) {
    if (spec.family !== family) continue;
    const distance = Math.abs(Math.log(spec.bakeSize / target));
    if (distance < bestDistance) {
      best = spec;
      bestDistance = distance;
    }
  }
  if (!best) throw new Error(`No bitmap font for "${family}"`);
  return best;
}

/**
 * BitmapText adds letter spacing in font units (it is scaled by
 * fontSize / data.size with the glyphs); Text took it in shown px.
 */
export function letterSpacingUnits(px: number, size: number, bakeSize: number): number {
  return (px * bakeSize) / size;
}

/** One glyph measured at the bake size (CanvasRenderingContext2D.measureText). */
export interface GlyphMetrics {
  char: string;
  advance: number;
  /** actualBoundingBoxLeft: how far ink goes left of the pen (positive = left). */
  left: number;
  /** actualBoundingBoxRight: where ink ends, from the pen. */
  right: number;
  ascent: number;
  descent: number;
}

/** Where a glyph sits in the atlas and where to draw it (baseline pen point). */
export interface GlyphCell {
  char: string;
  x: number;
  y: number;
  w: number;
  h: number;
  penX: number;
  penY: number;
}

export interface FontLayout {
  width: number;
  height: number;
  lineHeight: number;
  /** Baseline from the top of the line box. */
  ascent: number;
  cells: GlyphCell[];
  chars: Record<number, CharData>;
}

/** Room between cells, so linear filtering never samples a neighbour. */
const GAP = 2;

/**
 * Packs the glyph cells in shelves and builds Phaser's per-char data.
 * `lineAscent`/`lineDescent` are the line box Phaser's Text would use
 * (LINE_TEST), so origins land where the Text ones did; `pad` is the room
 * the outline needs around the ink.
 */
export function layoutFont(
  glyphs: readonly GlyphMetrics[],
  lineAscent: number,
  lineDescent: number,
  pad: number,
  maxWidth = 2048
): FontLayout {
  let inkAscent = lineAscent;
  let inkDescent = lineDescent;
  for (const g of glyphs) {
    inkAscent = Math.max(inkAscent, g.ascent);
    inkDescent = Math.max(inkDescent, g.descent);
  }
  const cellH = Math.ceil(inkAscent + inkDescent) + 2 * pad;
  const lineHeight = Math.ceil(lineAscent + lineDescent);

  const cells: GlyphCell[] = [];
  let x = GAP;
  let y = GAP;
  let width = 0;
  for (const g of glyphs) {
    const blank = g.char === ' ';
    const leftInk = Math.max(0, g.left);
    const w = blank ? 0 : Math.ceil(leftInk + Math.max(g.advance, g.right)) + 2 * pad;
    if (x + w + GAP > maxWidth && x > GAP) {
      x = GAP;
      y += cellH + GAP;
    }
    cells.push({ char: g.char, x, y, w, h: blank ? 0 : cellH, penX: x + pad + leftInk, penY: y + pad + inkAscent });
    x += w + GAP;
    width = Math.max(width, x);
  }
  const height = y + cellH + GAP;

  const chars: Record<number, CharData> = {};
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const c = cells[i];
    chars[g.char.charCodeAt(0)] = {
      x: c.x,
      y: c.y,
      width: c.w,
      height: c.h,
      centerX: Math.floor(c.w / 2),
      centerY: Math.floor(c.h / 2),
      xOffset: c.x - c.penX,
      yOffset: lineAscent - (c.penY - c.y),
      xAdvance: g.advance,
      data: {},
      kerning: {},
      u0: c.x / width,
      v0: 1 - c.y / height,
      u1: (c.x + c.w) / width,
      v1: 1 - (c.y + c.h) / height,
    };
  }
  return { width, height, lineHeight, ascent: lineAscent, cells, chars };
}

function cssFont(spec: BitmapFontSpec): string {
  return `${spec.bakeSize}px ${spec.family}`;
}

function measure(ctx: CanvasRenderingContext2D, char: string): GlyphMetrics {
  const m = ctx.measureText(char);
  return {
    char,
    advance: m.width,
    left: m.actualBoundingBoxLeft ?? 0,
    right: m.actualBoundingBoxRight ?? m.width,
    ascent: m.actualBoundingBoxAscent ?? 0,
    descent: m.actualBoundingBoxDescent ?? 0,
  };
}

/** Bakes one font into its own texture and registers it. Does nothing if it is there. */
export function buildBitmapFont(scene: Phaser.Scene, spec: BitmapFontSpec): void {
  const cache = scene.cache.bitmapFont;
  if (cache.exists(spec.key) && scene.textures.exists(spec.key)) return;

  const canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.font = cssFont(spec);
  const line = ctx.measureText(LINE_TEST);
  const glyphs = glyphList().map((char) => measure(ctx!, char));
  const pad = spec.outline + 1;
  const layout = layoutFont(glyphs, line.actualBoundingBoxAscent, line.actualBoundingBoxDescent, pad);

  canvas.width = layout.width;
  canvas.height = layout.height;
  // Resizing resets the context state.
  ctx = canvas.getContext('2d')!;
  ctx.font = cssFont(spec);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = spec.outline * 2;
  ctx.strokeStyle = CSS.INK;
  ctx.fillStyle = '#ffffff';
  for (const cell of layout.cells) {
    if (cell.w === 0) continue;
    ctx.strokeText(cell.char, cell.penX, cell.penY);
    ctx.fillText(cell.char, cell.penX, cell.penY);
  }

  if (scene.textures.exists(spec.key)) scene.textures.remove(spec.key);
  // A plain Texture (not a CanvasTexture): no pixel snapshot, uploaded once here.
  // `create` adds no frame; the base one is what addImage's parser adds.
  scene.textures.create(spec.key, canvas, layout.width, layout.height)?.add('__BASE', 0, 0, 0, layout.width, layout.height);
  const data: FontData = { font: spec.key, size: spec.bakeSize, lineHeight: layout.lineHeight, retroFont: false, chars: layout.chars };
  if (cache.exists(spec.key)) cache.remove(spec.key);
  cache.add(spec.key, { data, texture: spec.key, frame: null, fromAtlas: false });
}

/** Bakes every font the game uses. Call once the web fonts are in (BootScene). */
export function buildBitmapFonts(scene: Phaser.Scene): void {
  for (const spec of BITMAP_FONTS) buildBitmapFont(scene, spec);
}

export interface LabelOptions {
  /** Letter spacing in shown px, like Text's setLetterSpacing. */
  spacing?: number;
  originX?: number;
  originY?: number;
}

/**
 * A BitmapText in one of the baked fonts, shown at `size` px, tinted with
 * `color` (CSS hex or number). Bakes the fonts first if a scene runs
 * without the boot scene.
 */
export function addLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  family: string,
  size: number,
  color: string | number,
  options: LabelOptions = {}
): Phaser.GameObjects.BitmapText {
  const spec = pickBitmapFont(family, size);
  if (!scene.cache.bitmapFont.exists(spec.key)) buildBitmapFonts(scene);
  const label = scene.add.bitmapText(x, y, spec.key, text, size);
  label.setOrigin(options.originX ?? 0, options.originY ?? 0);
  label.setTint(typeof color === 'number' ? color : hexToNumber(color));
  if (options.spacing) label.setLetterSpacing(letterSpacingUnits(options.spacing, size, spec.bakeSize));
  return label;
}
