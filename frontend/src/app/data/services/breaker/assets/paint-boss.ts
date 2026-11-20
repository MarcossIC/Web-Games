import type * as Phaser from 'phaser';
import { BossArt, BossTexture, type BossTextureKey, bossTextureSpecs } from '@app/data/models/breaker/BreakerKeys';
import { darken, lighten, rgba } from './color';
import { clipped, createPaint, drawGlyph, linear, type Paint, radial, roundRectPath, seededRandom, withGlow } from './paint';
import type { Glyph } from './pixel-glyphs';

/**
 * The art of THE CORE, the boss of every 5th sector, in the Arcade Terminal
 * neon style: dark armored panels, energy seams and a lens-like eye whose
 * color tells the phase (cyan, yellow, magenta). Painted once at boot with
 * Canvas 2D, glows baked in, so the scene only moves images.
 */

const PANEL = '#100e1c';
const LINE = '#2a2540';
const CYAN = '#5ee6ff';
const YELLOW = '#ffe14a';
const MAGENTA = '#ff2e88';
const VIOLET = '#b78bff';

interface PhaseLook {
  /** Energy seams, vents and the outer glow. */
  energy: string;
  /** Second accent, on the fins. */
  accent: string;
}

const PHASE_LOOK: readonly PhaseLook[] = [
  { energy: CYAN, accent: VIOLET },
  { energy: YELLOW, accent: MAGENTA },
  { energy: MAGENTA, accent: YELLOW },
];

const PAD = BossArt.GLOW_PAD;
const W = BossArt.CORE_W;
const H = BossArt.CORE_H;
const CHAMFER = 16;

/** The hull outline: a long octagon with chamfered corners and a notch for the eye. */
function hullPath(ctx: CanvasRenderingContext2D): void {
  const x = PAD;
  const y = PAD;
  ctx.beginPath();
  ctx.moveTo(x + CHAMFER, y);
  ctx.lineTo(x + W - CHAMFER, y);
  ctx.lineTo(x + W, y + CHAMFER);
  ctx.lineTo(x + W, y + H - CHAMFER);
  ctx.lineTo(x + W - CHAMFER, y + H);
  ctx.lineTo(x + CHAMFER, y + H);
  ctx.lineTo(x, y + H - CHAMFER);
  ctx.lineTo(x, y + CHAMFER);
  ctx.closePath();
}

export function paintBossCore(p: Paint, phase: number): void {
  const { ctx, px } = p;
  const look = PHASE_LOOK[Math.max(0, Math.min(2, phase - 1))];
  const shape = () => hullPath(ctx);

  // Baked outer glow in the phase color.
  withGlow(p, rgba(look.energy, 0.85), 9, () => {
    shape();
    ctx.fillStyle = look.energy;
    ctx.fill();
  });

  // Armored hull.
  shape();
  ctx.fillStyle = linear(ctx, 0, PAD, 0, PAD + H, [
    [0, '#423c66'],
    [0.16, '#272240'],
    [0.6, '#15122a'],
    [1, '#09080f'],
  ]);
  ctx.fill();

  clipped(p, shape, () => {
    // Panel seams and rivets.
    ctx.fillStyle = rgba('#000000', 0.5);
    for (let x = PAD + 40; x < PAD + W - 20; x += 40) ctx.fillRect(x, PAD, 1.2, H);
    ctx.fillStyle = rgba('#ffffff', 0.1);
    for (let x = PAD + 41.2; x < PAD + W - 20; x += 40) ctx.fillRect(x, PAD, px, H);
    ctx.fillStyle = rgba('#c9d1e6', 0.55);
    for (let x = PAD + 20; x < PAD + W; x += 40) {
      ctx.fillRect(x - 1, PAD + 5, 2, 2);
      ctx.fillRect(x - 1, PAD + H - 7, 2, 2);
    }

    // The energy channel across the middle.
    const cy = PAD + 24;
    withGlow(p, look.energy, 5, () => {
      ctx.fillStyle = linear(ctx, 0, cy - 3, 0, cy + 3, [
        [0, darken(look.energy, 0.4)],
        [0.45, lighten(look.energy, 0.35)],
        [0.55, '#ffffff'],
        [1, darken(look.energy, 0.4)],
      ]);
      ctx.fillRect(PAD + 14, cy - 2.5, W - 28, 5);
    });
    // Breaks in the channel, so it reads as segments.
    ctx.fillStyle = '#15122a';
    for (let x = PAD + 54; x < PAD + W - 30; x += 46) ctx.fillRect(x, cy - 4, 3, 8);

    // Three vents on the crown.
    for (const vx of [PAD + W / 2 - 64, PAD + W / 2 - 9, PAD + W / 2 + 46]) {
      ctx.fillStyle = PANEL;
      ctx.fillRect(vx, PAD + 4, 18, 8);
      withGlow(p, look.energy, 3, () => {
        ctx.fillStyle = rgba(look.energy, 0.9);
        for (let k = 0; k < 3; k++) ctx.fillRect(vx + 2 + k * 5.5, PAD + 6, 3, 4);
      });
    }

    // Hazard fins on both ends.
    for (const side of [0, 1]) {
      const fx = side === 0 ? PAD : PAD + W - 26;
      ctx.save();
      ctx.beginPath();
      ctx.rect(fx, PAD + 30, 26, 22);
      ctx.clip();
      ctx.fillStyle = darken(look.accent, 0.55);
      ctx.fillRect(fx, PAD + 30, 26, 22);
      ctx.fillStyle = look.accent;
      for (let k = -2; k < 6; k++) {
        ctx.beginPath();
        ctx.moveTo(fx + k * 8, PAD + 52);
        ctx.lineTo(fx + k * 8 + 4, PAD + 52);
        ctx.lineTo(fx + k * 8 + 26, PAD + 30);
        ctx.lineTo(fx + k * 8 + 22, PAD + 30);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // The eye socket: a dark recess the eye sprite sits in.
    const ex = PAD + W / 2;
    const ey = PAD + BossArt.EYE_Y;
    ctx.fillStyle = '#05040a';
    ctx.beginPath();
    ctx.moveTo(ex - 36, PAD + H);
    ctx.lineTo(ex - 30, ey - 12);
    ctx.lineTo(ex + 30, ey - 12);
    ctx.lineTo(ex + 36, PAD + H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(look.energy, 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Light on the top edge, shade on the bottom one.
    ctx.fillStyle = rgba('#ffffff', 0.45);
    ctx.fillRect(PAD, PAD + px, W, 1);
    ctx.fillStyle = rgba('#000000', 0.5);
    ctx.fillRect(PAD, PAD + H - 3, W, 3);
  });

  // Rim.
  shape();
  ctx.strokeStyle = rgba(lighten(look.energy, 0.2), 0.85);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** Damage: hot cracks over the hull. Level 2 has more of them, so swapping reads as worse. */
export function paintBossCracks(p: Paint, level: 1 | 2): void {
  const { ctx } = p;
  const rand = seededRandom(level === 1 ? 4021 : 8807);
  const count = level === 1 ? 5 : 11;
  clipped(
    p,
    () => hullPath(ctx),
    () => {
      for (let i = 0; i < count; i++) {
        let x = PAD + 20 + rand() * (W - 40);
        let y = PAD + 4 + rand() * (H - 8);
        const segments = 3 + Math.floor(rand() * 4);
        const color = i % 3 === 0 ? YELLOW : '#ffffff';
        withGlow(p, i % 2 === 0 ? MAGENTA : YELLOW, 4, () => {
          ctx.strokeStyle = rgba(color, 0.9);
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let s = 0; s < segments; s++) {
            x += (rand() - 0.5) * 26;
            y += (rand() - 0.5) * 18;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
      }
    }
  );
}

/** The hit flash: the hull in white, faded by the view. */
export function paintBossFlash(p: Paint): void {
  const { ctx } = p;
  withGlow(p, rgba('#ffffff', 0.9), 8, () => {
    hullPath(ctx);
    ctx.fillStyle = rgba('#ffffff', 0.85);
    ctx.fill();
  });
}

/** The weak point: a lens with a slit, glowing in the phase color. */
export function paintBossEye(p: Paint, phase: number): void {
  const { ctx } = p;
  const look = PHASE_LOOK[Math.max(0, Math.min(2, phase - 1))];
  const cx = p.w / 2;
  const cy = p.h / 2;
  ctx.fillStyle = radial(ctx, cx, cy, p.w / 2, [
    [0, rgba(look.energy, 0.55)],
    [0.5, rgba(look.energy, 0.18)],
    [1, rgba(look.energy, 0)],
  ]);
  ctx.fillRect(0, 0, p.w, p.h);

  const lens = () => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 11, 0, 0, Math.PI * 2);
  };
  withGlow(p, look.energy, 6, () => {
    lens();
    ctx.fillStyle = look.energy;
    ctx.fill();
  });
  lens();
  ctx.fillStyle = radial(ctx, cx, cy, 24, [
    [0, '#ffffff'],
    [0.35, lighten(look.energy, 0.45)],
    [0.8, look.energy],
    [1, darken(look.energy, 0.45)],
  ]);
  ctx.fill();
  // The slit pupil.
  ctx.fillStyle = rgba(PANEL, 0.9);
  ctx.beginPath();
  ctx.ellipse(cx, cy, 3.2, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.8);
  ctx.fillRect(cx - 12, cy - 6, 6, 2);
}

/** An energy pellet: hot white core, magenta halo. */
export function paintBossPellet(p: Paint): void {
  const { ctx } = p;
  const c = p.w / 2;
  ctx.fillStyle = radial(ctx, c, c, c, [
    [0, rgba('#ffffff', 1)],
    [0.18, rgba(YELLOW, 1)],
    [0.32, rgba(MAGENTA, 0.95)],
    [0.6, rgba(MAGENTA, 0.35)],
    [1, rgba(MAGENTA, 0)],
  ]);
  ctx.fillRect(0, 0, p.w, p.h);
  ctx.strokeStyle = rgba('#ffffff', 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(c, c, 7, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------- lettering

/** A 5x7 pixel font with just the letters the boss needs (no web font to wait for). */
const LETTERS: Readonly<Record<string, Glyph>> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  G: ['.####', '#....', '#....', '#..##', '#...#', '#...#', '.###.'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  '·': ['.....', '.....', '.....', '..#..', '.....', '.....', '.....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

/** Width in world px of `text` in the pixel font at `cell` px per cell. */
export function pixelTextWidth(text: string, cell: number): number {
  return Math.max(0, text.length * 6 - 1) * cell;
}

function drawPixelText(p: Paint, text: string, x: number, y: number, cell: number, color: string): void {
  for (let i = 0; i < text.length; i++) {
    const glyph = LETTERS[text[i]];
    if (glyph) drawGlyph(p, glyph, x + i * 6 * cell, y, cell, color);
  }
}

/** The HP bar frame: a dark plate, CORE written on its left, ticks at 60% and 30%. */
export function paintBossHpFrame(p: Paint): void {
  const { ctx } = p;
  ctx.fillStyle = rgba(PANEL, 0.92);
  roundRectPath(ctx, 0.5, 0.5, p.w - 1, p.h - 1, 4);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  withGlow(p, MAGENTA, 4, () => drawPixelText(p, 'CORE', 9, 4, 2, MAGENTA));
  // The well the fill sits in.
  ctx.fillStyle = '#05040a';
  ctx.fillRect(BossArt.HP_FILL_X - 2, BossArt.HP_FILL_Y - 2, BossArt.HP_FILL_W + 4, BossArt.HP_FILL_H + 4);
  ctx.strokeStyle = rgba(MAGENTA, 0.5);
  ctx.strokeRect(BossArt.HP_FILL_X - 2, BossArt.HP_FILL_Y - 2, BossArt.HP_FILL_W + 4, BossArt.HP_FILL_H + 4);
  ctx.fillStyle = rgba('#ecebff', 0.7);
  for (const share of [0.6, 0.3]) {
    const tx = BossArt.HP_FILL_X + BossArt.HP_FILL_W * share;
    ctx.fillRect(tx - 0.5, BossArt.HP_FILL_Y - 4, 1, 2);
    ctx.fillRect(tx - 0.5, BossArt.HP_FILL_Y + BossArt.HP_FILL_H + 2, 1, 2);
  }
}

/** The HP fill: magenta to yellow with a bright top edge. The view crops it. */
export function paintBossHpFill(p: Paint): void {
  const { ctx } = p;
  ctx.fillStyle = linear(ctx, 0, 0, p.w, 0, [
    [0, MAGENTA],
    [0.6, '#ff6a5c'],
    [1, YELLOW],
  ]);
  ctx.fillRect(0, 0, p.w, p.h);
  ctx.fillStyle = rgba('#ffffff', 0.55);
  ctx.fillRect(0, 0, p.w, 1.5);
  ctx.fillStyle = rgba('#000000', 0.3);
  ctx.fillRect(0, p.h - 2, p.w, 2);
}

/** WARNING · CORE between two hazard stripes: the boss sector's own banner. */
export function paintBossWarning(p: Paint): void {
  const { ctx } = p;
  ctx.fillStyle = rgba(PANEL, 0.86);
  ctx.fillRect(0, 10, p.w, p.h - 20);
  for (const top of [0, p.h - 10]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, p.w, 10);
    ctx.clip();
    ctx.fillStyle = '#1a1508';
    ctx.fillRect(0, top, p.w, 10);
    ctx.fillStyle = YELLOW;
    for (let x = -10; x < p.w + 10; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, top + 10);
      ctx.lineTo(x + 10, top + 10);
      ctx.lineTo(x + 20, top);
      ctx.lineTo(x + 10, top);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  const text = 'WARNING · CORE';
  const cell = 4;
  const x = (p.w - pixelTextWidth(text, cell)) / 2;
  const y = (p.h - 7 * cell) / 2;
  withGlow(p, MAGENTA, 8, () => drawPixelText(p, text, x, y, cell, '#ffd1e4'));
  drawPixelText(p, text, x, y, cell, '#ffffff');
}

/** Electric arcs over a jammed paddle. */
export function paintBossStun(p: Paint): void {
  const { ctx } = p;
  const rand = seededRandom(3301);
  for (let arc = 0; arc < 4; arc++) {
    let x = 6;
    let y = p.h / 2 + (rand() - 0.5) * 16;
    withGlow(p, CYAN, 5, () => {
      ctx.strokeStyle = arc % 2 === 0 ? '#ffffff' : CYAN;
      ctx.lineWidth = arc % 2 === 0 ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      while (x < p.w - 6) {
        x += 6 + rand() * 8;
        y = Math.max(4, Math.min(p.h - 4, y + (rand() - 0.5) * 18));
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }
}

/** The rail the core glides on: a faint dashed line under the ceiling. */
export function paintBossRail(p: Paint): void {
  const { ctx } = p;
  const cy = p.h / 2;
  ctx.fillStyle = rgba(CYAN, 0.12);
  ctx.fillRect(0, cy - 2, p.w, 4);
  ctx.fillStyle = rgba(CYAN, 0.45);
  for (let x = 4; x < p.w; x += 16) ctx.fillRect(x, cy - 0.5, 8, 1);
  ctx.fillStyle = rgba(VIOLET, 0.6);
  for (let x = 0; x < p.w; x += 96) ctx.fillRect(x, cy - 3, 2, 6);
}

const BOSS_PAINTERS: Record<BossTextureKey, (p: Paint) => void> = {
  [BossTexture.CORE_1]: (p) => paintBossCore(p, 1),
  [BossTexture.CORE_2]: (p) => paintBossCore(p, 2),
  [BossTexture.CORE_3]: (p) => paintBossCore(p, 3),
  [BossTexture.CRACKS_1]: (p) => paintBossCracks(p, 1),
  [BossTexture.CRACKS_2]: (p) => paintBossCracks(p, 2),
  [BossTexture.FLASH]: paintBossFlash,
  [BossTexture.EYE_1]: (p) => paintBossEye(p, 1),
  [BossTexture.EYE_2]: (p) => paintBossEye(p, 2),
  [BossTexture.EYE_3]: (p) => paintBossEye(p, 3),
  [BossTexture.PELLET]: paintBossPellet,
  [BossTexture.HP_FRAME]: paintBossHpFrame,
  [BossTexture.HP_FILL]: paintBossHpFill,
  [BossTexture.WARNING]: paintBossWarning,
  [BossTexture.STUN]: paintBossStun,
  [BossTexture.RAIL]: paintBossRail,
};

/** Paints the boss textures that are not there yet (idempotent, like the rest). */
export function generateBossTextures(scene: Phaser.Scene): void {
  const textures = scene.textures;
  for (const spec of bossTextureSpecs()) {
    if (textures.exists(spec.key)) continue;
    const p = createPaint(spec.width, spec.height, spec.scale);
    BOSS_PAINTERS[spec.key as BossTextureKey](p);
    textures.addCanvas(spec.key, p.canvas);
  }
}
