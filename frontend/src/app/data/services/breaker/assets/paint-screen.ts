import { HudArt } from '@app/data/models/breaker/BreakerKeys';
import { rgba } from './color';
import { createPaint, linear, Paint, radial, roundRectPath, seededRandom, withGlow } from './paint';

/** Site palette (src/styles.css, --gg-*). */
const INK = '#07060d';
const PANEL = '#100e1c';
const LINE = '#2a2540';
const TEXT = '#ece9f7';
const MAGENTA = '#ff2e88';
const CYAN = '#5ee6ff';
const VIOLET = '#b78bff';

/** Where the synthwave floor meets the sky: under the bricks, above the paddle. */
export const HORIZON_Y = 520;

const STAR_TINTS = ['#ffffff', '#ffffff', '#cfefff', '#ffd6ea', '#e6dcff'];

function star(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, tint: string): void {
  ctx.fillStyle = rgba(tint, alpha);
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  if (size > 1.4) {
    // A faint cross on the brightest ones.
    ctx.fillStyle = rgba(tint, alpha * 0.35);
    ctx.fillRect(x - size * 1.8, y - 0.25, size * 3.6, 0.5);
    ctx.fillRect(x - 0.25, y - size * 1.8, 0.5, size * 3.6);
  }
}

/** Deep space, a magenta/violet nebula on the horizon, a faint sun and a perspective grid. */
export function paintSpaceBackground(p: Paint): void {
  const { ctx, w, h } = p;
  const hy = HORIZON_Y;

  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, INK],
    [0.4, '#0a0816'],
    [hy / h - 0.06, '#170b2c'],
    [hy / h, '#2a0d3c'],
    [hy / h + 0.005, '#14071f'],
    [1, INK],
  ]);
  ctx.fillRect(0, 0, w, h);

  // Nebula glows, added light on light.
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, color, alpha] of [
    [w / 2, hy, 460, MAGENTA, 0.2],
    [w * 0.26, hy - 90, 300, VIOLET, 0.12],
    [w * 0.8, hy - 160, 240, CYAN, 0.06],
    [w * 0.62, hy - 30, 200, '#ff9a3d', 0.05],
  ] as const) {
    ctx.fillStyle = radial(ctx, x, y, r, [
      [0, rgba(color, alpha)],
      [0.5, rgba(color, alpha * 0.35)],
      [1, rgba(color, 0)],
    ]);
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';

  // Stars, above the horizon only.
  const random = seededRandom(0x5ace);
  for (let i = 0; i < 240; i++) {
    const y = 64 + Math.pow(random(), 1.25) * (hy - 70);
    const fade = 1 - (y - 64) / (hy - 64);
    star(ctx, random() * w, y, 0.6 + random() * 1.3, (0.2 + random() * 0.7) * (0.35 + 0.65 * fade), STAR_TINTS[i % STAR_TINTS.length]);
  }

  // A faint striped sun sinking into the horizon, cut on its own canvas so the
  // stripes do not punch through the sky.
  const sunR = 120;
  const sun = createPaint(sunR * 2, sunR, p.scale);
  sun.ctx.fillStyle = linear(sun.ctx, 0, 0, 0, sunR, [
    [0, '#ffe14a'],
    [0.55, '#ff9a3d'],
    [1, MAGENTA],
  ]);
  sun.ctx.beginPath();
  sun.ctx.arc(sunR, sunR, sunR, Math.PI, 0);
  sun.ctx.fill();
  sun.ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 6; i++) {
    sun.ctx.fillRect(0, sunR - 60 + i * 11, sunR * 2, 1.5 + i * 1.1);
  }
  ctx.globalAlpha = 0.2;
  ctx.drawImage(sun.canvas, w / 2 - sunR, hy - sunR, sunR * 2, sunR);
  ctx.globalAlpha = 1;

  // Horizon line with a glow band.
  ctx.fillStyle = linear(ctx, 0, hy - 14, 0, hy + 14, [
    [0, rgba(MAGENTA, 0)],
    [0.5, rgba(MAGENTA, 0.28)],
    [1, rgba(MAGENTA, 0)],
  ]);
  ctx.fillRect(0, hy - 14, w, 28);
  ctx.fillStyle = rgba('#ff8fc4', 0.7);
  ctx.fillRect(0, hy, w, 1);

  // Perspective grid on the floor.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, hy + 1, w, h - hy);
  ctx.clip();
  const vx = w / 2;
  const vy = hy - 60;
  ctx.lineWidth = 1;
  ctx.strokeStyle = linear(ctx, 0, hy, 0, h, [
    [0, rgba(MAGENTA, 0)],
    [0.35, rgba(MAGENTA, 0.16)],
    [1, rgba(MAGENTA, 0.32)],
  ]);
  for (let i = -24; i <= 24; i++) {
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(vx + i * 80, h + 40);
    ctx.stroke();
  }
  for (let k = 1; k <= 9; k++) {
    const y = hy + (h - hy) * Math.pow(k / 9, 1.9);
    ctx.strokeStyle = rgba(MAGENTA, 0.08 + 0.24 * (k / 9));
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(w, Math.round(y) + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** Sparse stars on transparency that wrap on both axes: scroll it slowly as a TileSprite. */
export function paintStarLayer(p: Paint): void {
  const { ctx, w, h } = p;
  const random = seededRandom(0x57a75);
  for (let i = 0; i < 70; i++) {
    const x = random() * w;
    const y = random() * h;
    const size = 0.8 + random() * 1.2;
    const alpha = 0.3 + random() * 0.6;
    const tint = STAR_TINTS[i % STAR_TINTS.length];
    for (const dx of [-w, 0, w]) {
      for (const dy of [-h, 0, h]) {
        star(ctx, x + dx, y + dy, size, alpha, tint);
      }
    }
  }
}

/** Dark 1 px line every 3 px, alpha baked low. */
export function paintScanlines(p: Paint, alpha = 0.16): void {
  const { ctx, w, h } = p;
  ctx.fillStyle = rgba('#000000', alpha);
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
}

/** Clear middle, darker corners. */
export function paintVignette(p: Paint): void {
  const { ctx, w, h } = p;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  ctx.fillStyle = radial(ctx, 0, 0, w * 0.72, [
    [0, rgba(INK, 0)],
    [0.5, rgba(INK, 0)],
    [0.78, rgba(INK, 0.28)],
    [1, rgba(INK, 0.72)],
  ]);
  ctx.fillRect(-w, -w, w * 2, w * 2);
  ctx.restore();
}

/** Scanlines and vignette in one texture, one full-screen pass. */
export function paintCrtOverlay(p: Paint): void {
  paintScanlines(p, 0.13);
  paintVignette(p);
}

/**
 * The top band 0..64: panel color with faint texture, and the site's slab under it,
 * hard layers with no blur: a cyan fringe, a bright line, then magenta into violet.
 */
export function paintHudPanel(p: Paint): void {
  const { ctx, w, h, px } = p;
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, '#151229'],
    [1, PANEL],
  ]);
  ctx.fillRect(0, 0, w, h);

  // Scanlines, like --gg-scanlines.
  ctx.fillStyle = rgba('#ffffff', 0.035);
  for (let y = 0; y < h - 9; y += 3) {
    ctx.fillRect(0, y, w, px);
  }
  // Dot grid.
  ctx.fillStyle = rgba('#ffffff', 0.05);
  for (let y = 6; y < h - 12; y += 8) {
    for (let x = 4; x < w; x += 8) {
      ctx.fillRect(x, y, px * 2, px * 2);
    }
  }
  // Top hairline.
  ctx.fillStyle = LINE;
  ctx.fillRect(0, 0, w, 1);

  // Slab.
  const slab: readonly (readonly [number, number, string])[] = [
    [h - 9, 1, CYAN],
    [h - 8, 2, TEXT],
    [h - 6, 2, MAGENTA],
    [h - 4, 2, '#b3186a'],
    [h - 2, 2, '#5a1a8c'],
  ];
  for (const [y, height, color] of slab) {
    ctx.fillStyle = color;
    ctx.fillRect(0, y, w, height);
  }
  // Ticks rising from the slab every 80 px, brackets at both ends.
  ctx.fillStyle = rgba(CYAN, 0.45);
  for (let x = 80; x < w; x += 80) {
    ctx.fillRect(x, h - 13, 1, 4);
  }
  ctx.fillStyle = CYAN;
  ctx.fillRect(6, h - 15, 12, 1);
  ctx.fillRect(6, h - 15, 1, 6);
  ctx.fillRect(w - 18, h - 15, 12, 1);
  ctx.fillRect(w - 7, h - 15, 1, 6);
}

/** Mini paddle for the lives counter. */
export function paintHudLife(p: Paint): void {
  const { ctx, w, h, px } = p;
  const bx = 2;
  const by = 3;
  const bw = w - 4;
  const bh = h - 6;
  // A bright energy bar with a strong glow: it has to read at 28x12 next to the score.
  withGlow(p, CYAN, 2.5, () => {
    roundRectPath(ctx, bx, by, bw, bh, 3);
    ctx.fillStyle = linear(ctx, 0, by, 0, by + bh, [
      [0, CYAN],
      [0.5, '#ffffff'],
      [1, '#2fb8d8'],
    ]);
    ctx.fill();
  });
  for (const x of [bx, bx + bw - 3.5]) {
    roundRectPath(ctx, x, by, 3.5, bh, 1.5);
    ctx.fillStyle = linear(ctx, 0, by, 0, by + bh, [
      [0, '#ffffff'],
      [1, '#8d95ad'],
    ]);
    ctx.fill();
  }
  ctx.fillStyle = MAGENTA;
  ctx.fillRect(bx + 3.5, by + 0.5, px * 2, bh - 1);
  ctx.fillRect(bx + bw - 3.5 - px * 2, by + 0.5, px * 2, bh - 1);
}

/** Overdrive meter frame: hard edges, cyan on top/left, magenta on bottom/right. */
export function paintMeterFrame(p: Paint): void {
  const { ctx, w, h } = p;
  ctx.fillStyle = rgba(INK, 0.92);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PANEL;
  ctx.fillRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = LINE;
  ctx.fillRect(HudArt.FILL_INSET - 1, HudArt.FILL_INSET - 1, HudArt.FILL_WIDTH + 2, 1);
  ctx.fillRect(HudArt.FILL_INSET - 1, HudArt.FILL_INSET + HudArt.FILL_HEIGHT, HudArt.FILL_WIDTH + 2, 1);
  ctx.fillStyle = CYAN;
  ctx.fillRect(0, 0, w, 1);
  ctx.fillRect(0, 0, 1, h);
  ctx.fillStyle = MAGENTA;
  ctx.fillRect(0, h - 1, w, 1);
  ctx.fillRect(w - 1, 0, 1, h);
  ctx.fillStyle = TEXT;
  for (const [x, y] of [
    [0, 0],
    [w - 2, 0],
    [0, h - 2],
    [w - 2, h - 2],
  ] as const) {
    ctx.fillRect(x, y, 2, 2);
  }
}

/** Meter fill, magenta to yellow, in 10 segments: crop it in the scene to show the charge. */
export function paintMeterFill(p: Paint): void {
  const { ctx, w, h, px } = p;
  ctx.fillStyle = linear(ctx, 0, 0, w, 0, [
    [0, MAGENTA],
    [0.55, '#ff9a3d'],
    [1, '#ffe14a'],
  ]);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, rgba('#ffffff', 0.55)],
    [0.45, rgba('#ffffff', 0.08)],
    [0.55, rgba('#000000', 0)],
    [1, rgba('#000000', 0.3)],
  ]);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = rgba('#ffffff', 0.14);
  for (let x = -h; x < w; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + 2, h);
    ctx.lineTo(x + 2 + h, 0);
    ctx.lineTo(x + h, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = rgba(INK, 0.7);
  for (let i = 1; i < 10; i++) {
    ctx.fillRect(Math.round((w * i) / 10), 0, 1, h);
  }
  ctx.fillStyle = rgba('#ffffff', 0.9);
  ctx.fillRect(0, 0, w, px);
}
