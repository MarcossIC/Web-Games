import { Glyph, glyphCells } from './pixel-glyphs';

/**
 * A canvas to paint one texture on, in WORLD units: the context is pre-scaled by
 * `scale`, so painters write 66x26 for a brick and get a 132x52 texture at 2x.
 * `px` is one texture pixel in world units, for crisp hairlines.
 */
export interface Paint {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** World size. */
  readonly w: number;
  readonly h: number;
  readonly scale: number;
  readonly px: number;
}

export type Stops = readonly (readonly [number, string])[];

export function createPaint(width: number, height: number, scale: number): Paint {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D is not available');
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  return { canvas, ctx, w: width, h: height, scale, px: 1 / scale };
}

type PathSink = Pick<CanvasPath, 'moveTo' | 'lineTo' | 'arcTo' | 'closePath'>;

function traceRoundRect(path: PathSink, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  path.moveTo(x + radius, y);
  path.lineTo(x + w - radius, y);
  path.arcTo(x + w, y, x + w, y + radius, radius);
  path.lineTo(x + w, y + h - radius);
  path.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  path.lineTo(x + radius, y + h);
  path.arcTo(x, y + h, x, y + h - radius, radius);
  path.lineTo(x, y + radius);
  path.arcTo(x, y, x + radius, y, radius);
  path.closePath();
}

/** Starts a new rounded-rect path on the context. */
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  traceRoundRect(ctx, x, y, w, h, r);
}

/** A rounded rect as a Path2D, to combine (even-odd) or stroke later. */
export function pathOf(x: number, y: number, w: number, h: number, r: number): Path2D {
  const path = new Path2D();
  traceRoundRect(path, x, y, w, h, r);
  return path;
}

export function linear(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: Stops,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, color] of stops) {
    gradient.addColorStop(at, color);
  }
  return gradient;
}

export function radial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  stops: Stops,
  innerX = x,
  innerY = y,
  innerR = 0,
): CanvasGradient {
  const gradient = ctx.createRadialGradient(innerX, innerY, innerR, x, y, r);
  for (const [at, color] of stops) {
    gradient.addColorStop(at, color);
  }
  return gradient;
}

/**
 * Draws with a baked glow. Canvas shadows ignore the transform, so the blur is
 * converted from world to texture pixels here.
 */
export function withGlow(p: Paint, color: string, blurWorld: number, draw: () => void): void {
  const { ctx } = p;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blurWorld * p.scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  draw();
  ctx.restore();
}

/** Runs `draw` clipped to the path `shape` builds. */
export function clipped(p: Paint, shape: () => void, draw: () => void): void {
  const { ctx } = p;
  ctx.save();
  shape();
  ctx.clip();
  draw();
  ctx.restore();
}

/** Rounds a world coordinate to the texture pixel grid, so pixel glyphs stay crisp. */
export function snap(p: Paint, value: number): number {
  return Math.round(value * p.scale) / p.scale;
}

/** Paints a pixel glyph with its top-left at (x, y), `cell` world px per cell. */
export function drawGlyph(p: Paint, glyph: Glyph, x: number, y: number, cell: number, color: string): void {
  const { ctx } = p;
  const left = snap(p, x);
  const top = snap(p, y);
  ctx.fillStyle = color;
  for (const { col, row } of glyphCells(glyph)) {
    ctx.fillRect(left + col * cell, top + row * cell, cell, cell);
  }
}

/** A tiny seeded generator, so cracks, stars and brushed metal look the same every run. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
