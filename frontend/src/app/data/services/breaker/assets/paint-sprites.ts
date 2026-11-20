import { BallArt, BarrierArt, CapsuleArt, HudArt, LaserArt, PaddleArt } from '@app/data/models/breaker/BreakerKeys';
import type { PowerUpKind, TimedEffectKind } from '../engine/types';
import { CAPSULE_STYLES } from './breaker-themes';
import { darken, lighten, rgba } from './color';
import { GLYPH_SIZE, PIXEL_GLYPHS } from './pixel-glyphs';
import { clipped, createPaint, drawGlyph, linear, Paint, radial, roundRectPath, withGlow } from './paint';

// ---------------------------------------------------------------- paddle

export type PaddleVariant = 'normal' | 'laser' | 'magnet';

const PADDLE_LOOK: Record<PaddleVariant, { core: string; band: string }> = {
  normal: { core: '#5ee6ff', band: '#ff2e88' },
  laser: { core: '#ff5c7a', band: '#ffe14a' },
  magnet: { core: '#b78bff', band: '#5ee6ff' },
};

/**
 * The paddle: metal housing, an energy core along the middle, metallic caps.
 * The middle slice is made uniform column by column at the end, so a 3-slice
 * can stretch it to any width without showing it.
 */
export function paintPaddle(p: Paint, variant: PaddleVariant): void {
  const { ctx, px } = p;
  const { core, band } = PADDLE_LOOK[variant];
  const pad = PaddleArt.GLOW_PAD;
  const bodyW = PaddleArt.BASE_BODY_WIDTH;
  const bodyH = PaddleArt.BODY_HEIGHT;
  const r = 6;
  const body = () => roundRectPath(ctx, pad, pad, bodyW, bodyH, r);

  if (variant === 'magnet') {
    // Magnetic field rising off the top edge.
    ctx.fillStyle = linear(ctx, 0, pad - 5, 0, pad + 2, [
      [0, rgba(core, 0)],
      [1, rgba(core, 0.55)],
    ]);
    ctx.fillRect(pad + 4, pad - 5, bodyW - 8, 7);
  }

  // Baked outer glow.
  withGlow(p, rgba(core, 0.9), 5, () => {
    body();
    ctx.fillStyle = core;
    ctx.fill();
  });

  // Housing.
  body();
  ctx.fillStyle = linear(ctx, 0, pad, 0, pad + bodyH, [
    [0, '#4a5274'],
    [0.18, '#2c3250'],
    [0.6, '#151a2c'],
    [1, '#0a0c16'],
  ]);
  ctx.fill();

  clipped(p, body, () => {
    // Energy core channel.
    const cy = pad + bodyH / 2;
    withGlow(p, core, 4, () => {
      ctx.fillStyle = linear(ctx, 0, cy - 3.5, 0, cy + 3.5, [
        [0, darken(core, 0.35)],
        [0.3, core],
        [0.5, '#ffffff'],
        [0.7, core],
        [1, darken(core, 0.35)],
      ]);
      ctx.fillRect(0, cy - 3.5, p.w, 7);
    });
    // Top light edge and bottom shadow of the housing.
    ctx.fillStyle = rgba('#ffffff', 0.55);
    ctx.fillRect(0, pad + px, p.w, px);
    ctx.fillStyle = rgba('#000000', 0.45);
    ctx.fillRect(0, pad + bodyH - 2, p.w, 2);
  });

  uniformMiddle(p, PaddleArt.CAP_WIDTH, p.w - PaddleArt.CAP_WIDTH);

  // Caps: drawn only inside the cap slices, the left one mirrored for the right.
  for (const side of [-1, 1] as const) {
    ctx.save();
    if (side === 1) {
      ctx.translate(p.w, 0);
      ctx.scale(-1, 1);
    }
    ctx.beginPath();
    ctx.rect(0, 0, PaddleArt.CAP_WIDTH - 3, p.h);
    ctx.clip();
    paintCap(p, variant, core, band);
    ctx.restore();
  }
}

function paintCap(p: Paint, variant: PaddleVariant, core: string, band: string): void {
  const { ctx, px } = p;
  const pad = PaddleArt.GLOW_PAD;
  const bodyH = PaddleArt.BODY_HEIGHT;
  const capW = 15;

  if (variant === 'laser') {
    // Cannon barrel sticking up into the top pad, red-hot muzzle.
    const bx = pad + 5;
    ctx.fillStyle = linear(ctx, bx, 0, bx + 5, 0, [
      [0, '#5a6178'],
      [0.4, '#eef2ff'],
      [1, '#3a3f52'],
    ]);
    ctx.fillRect(bx, 1.5, 5, pad);
    withGlow(p, '#ff5c5c', 3, () => {
      ctx.fillStyle = '#ff5c5c';
      ctx.fillRect(bx + 0.5, 1, 4, 1.5);
    });
    ctx.fillStyle = '#fff0f0';
    ctx.fillRect(bx + 1.5, 1, 2, px * 2);
  }

  // Metal cap.
  roundRectPath(ctx, pad, pad, capW + 6, bodyH, 6);
  ctx.fillStyle = linear(ctx, 0, pad, 0, pad + bodyH, [
    [0, '#f4f7ff'],
    [0.35, '#b1b9cf'],
    [0.7, '#5d647c'],
    [1, '#2a2f42'],
  ]);
  ctx.fill();
  // Its inner edge, where it meets the core.
  ctx.fillStyle = rgba('#0a0c16', 0.7);
  ctx.fillRect(pad + capW, pad + 1, px * 2, bodyH - 2);

  // Colored band with a glow.
  withGlow(p, band, 3, () => {
    ctx.fillStyle = band;
    ctx.fillRect(pad + capW - 4, pad + 2, 2, bodyH - 4);
  });

  if (variant === 'magnet') {
    // Coil windings.
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#d79a5a' : '#8a5a2a';
      ctx.fillRect(pad + 3 + i * 2.2, pad + 3, 1.4, bodyH - 6);
    }
    withGlow(p, core, 3, () => {
      ctx.fillStyle = rgba(core, 0.6);
      ctx.fillRect(pad + 3, pad + 2, 8, px * 2);
    });
  } else {
    // Vents.
    ctx.fillStyle = rgba('#0a0c16', 0.55);
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(pad + 4, pad + 6 + i * 2.6, 6, px * 2);
    }
  }

  // Top highlight of the cap.
  ctx.fillStyle = rgba('#ffffff', 0.9);
  ctx.fillRect(pad + 4, pad + px, capW - 4, px);
}

/** Copies the centre column over [x0, x1) (world px), so the middle slice stretches cleanly. */
function uniformMiddle(p: Paint, x0: number, x1: number): void {
  const s = p.scale;
  const height = p.canvas.height;
  const column = p.ctx.getImageData(Math.round(p.canvas.width / 2), 0, 1, height);
  for (let x = Math.round(x0 * s); x < Math.round(x1 * s); x++) {
    p.ctx.putImageData(column, x, 0);
  }
}

// ---------------------------------------------------------------- ball and trail

export type BallVariant = 'normal' | 'fire' | 'nova';

const BALL_LOOK: Record<BallVariant, { halo: string; inner: string; edge: string }> = {
  normal: { halo: '#5ee6ff', inner: '#ffffff', edge: '#bff4ff' },
  fire: { halo: '#ff6a1c', inner: '#fff6d0', edge: '#ffb13d' },
  nova: { halo: '#ff2e88', inner: '#ffffff', edge: '#ffb3d6' },
};

/** White-hot core of radius CORE_RADIUS with its halo baked out to SIZE / 2. */
export function paintBall(p: Paint, variant: BallVariant): void {
  const { ctx } = p;
  const { halo, inner, edge } = BALL_LOOK[variant];
  const c = BallArt.SIZE / 2;
  const core = BallArt.CORE_RADIUS;

  ctx.fillStyle = radial(ctx, c, c, c, [
    [0, rgba(halo, 0.9)],
    [core / c, rgba(halo, 0.5)],
    [0.75, rgba(halo, 0.16)],
    [1, rgba(halo, 0)],
  ]);
  ctx.fillRect(0, 0, p.w, p.h);

  if (variant === 'nova') {
    // Four soft rays.
    ctx.fillStyle = linear(ctx, 0, c, p.w, c, [
      [0, rgba('#ffffff', 0)],
      [0.5, rgba('#ffffff', 0.55)],
      [1, rgba('#ffffff', 0)],
    ]);
    ctx.fillRect(1, c - 0.75, p.w - 2, 1.5);
    ctx.fillStyle = linear(ctx, c, 0, c, p.h, [
      [0, rgba('#ffffff', 0)],
      [0.5, rgba('#ffffff', 0.55)],
      [1, rgba('#ffffff', 0)],
    ]);
    ctx.fillRect(c - 0.75, 1, 1.5, p.h - 2);
  }

  ctx.fillStyle = radial(
    ctx,
    c,
    c,
    core,
    [
      [0, inner],
      [0.55, inner],
      [0.85, edge],
      [1, lighten(halo, 0.2)],
    ],
    c - 1.5,
    c - 1.5,
    0,
  );
  ctx.beginPath();
  ctx.arc(c, c, core, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = rgba('#ffffff', 0.7);
  ctx.lineWidth = p.px * 1.5;
  ctx.beginPath();
  ctx.arc(c, c, core - p.px, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
}

/** Soft white dot for a pooled trail; tint and fade it in the scene. */
export function paintSoftDot(p: Paint, solidUntil: number): void {
  const { ctx } = p;
  const c = p.w / 2;
  ctx.fillStyle = radial(ctx, c, c, c, [
    [0, '#ffffff'],
    [solidUntil, '#ffffff'],
    [Math.min(0.95, solidUntil + 0.3), rgba('#ffffff', 0.45)],
    [1, rgba('#ffffff', 0)],
  ]);
  ctx.fillRect(0, 0, p.w, p.h);
}

// ---------------------------------------------------------------- capsules and icons

/** Pill 56x24 with GLOW_PAD of glow around it, colored per kind, with a pixel glyph. */
export function paintCapsule(p: Paint, kind: PowerUpKind): void {
  const { ctx, px } = p;
  const { color, negative } = CAPSULE_STYLES[kind];
  const pad = CapsuleArt.GLOW_PAD;
  const bw = CapsuleArt.BODY_WIDTH;
  const bh = CapsuleArt.BODY_HEIGHT;
  const r = bh / 2;
  const body = () => roundRectPath(ctx, pad, pad, bw, bh, r);

  withGlow(p, rgba(color, 0.95), 3.5, () => {
    body();
    ctx.fillStyle = color;
    ctx.fill();
  });

  body();
  ctx.fillStyle = negative
    ? linear(ctx, 0, pad, 0, pad + bh, [
        [0, '#6a1622'],
        [0.5, '#2e0a12'],
        [1, '#14040a'],
      ])
    : linear(ctx, 0, pad, 0, pad + bh, [
        [0, lighten(color, 0.55)],
        [0.35, color],
        [0.7, darken(color, 0.3)],
        [1, darken(color, 0.62)],
      ]);
  ctx.fill();

  clipped(p, body, () => {
    if (negative) {
      // Hazard stripes on both ends.
      ctx.fillStyle = rgba(color, 0.9);
      for (const [from, to] of [
        [pad, pad + 13],
        [pad + bw - 13, pad + bw],
      ] as const) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(from, pad, to - from, bh);
        ctx.clip();
        for (let x = from - bh; x < to; x += 6) {
          ctx.beginPath();
          ctx.moveTo(x, pad + bh);
          ctx.lineTo(x + 3, pad + bh);
          ctx.lineTo(x + 3 + bh, pad);
          ctx.lineTo(x + bh, pad);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }
    // Gloss.
    ctx.fillStyle = linear(ctx, 0, pad, 0, pad + bh * 0.5, [
      [0, rgba('#ffffff', negative ? 0.3 : 0.6)],
      [1, rgba('#ffffff', 0)],
    ]);
    ctx.fillRect(pad + 4, pad + 1.5, bw - 8, bh * 0.42);
  });

  // Dark label window holding the glyph.
  const lw = 26;
  const lh = 18;
  const lx = pad + (bw - lw) / 2;
  const ly = pad + (bh - lh) / 2;
  roundRectPath(ctx, lx, ly, lw, lh, 4);
  ctx.fillStyle = rgba('#07060d', negative ? 0.75 : 0.62);
  ctx.fill();
  ctx.strokeStyle = rgba(lighten(color, 0.4), 0.7);
  ctx.lineWidth = px;
  ctx.stroke();

  const cell = 2;
  const size = GLYPH_SIZE * cell;
  withGlow(p, color, 3, () =>
    drawGlyph(p, PIXEL_GLYPHS[kind], p.w / 2 - size / 2, p.h / 2 - size / 2, cell, negative ? '#ffb0b0' : '#ffffff'),
  );

  // Crisp outline.
  ctx.strokeStyle = rgba(negative ? '#ff5c5c' : darken(color, 0.7), 0.95);
  ctx.lineWidth = px;
  roundRectPath(ctx, pad + px / 2, pad + px / 2, bw - px, bh - px, r);
  ctx.stroke();
}

/** 24x24 HUD icon of a timed effect: dark tile, colored border, the capsule's glyph. */
export function paintEffectIcon(p: Paint, kind: TimedEffectKind): void {
  const { ctx } = p;
  const { color } = CAPSULE_STYLES[kind];
  const size = HudArt.EFFECT_ICON_SIZE;

  roundRectPath(ctx, 1, 1, size - 2, size - 2, 4);
  ctx.fillStyle = linear(ctx, 0, 0, 0, size, [
    [0, '#1d1932'],
    [1, '#0b0915'],
  ]);
  ctx.fill();
  withGlow(p, color, 2.5, () => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, 1.75, 1.75, size - 3.5, size - 3.5, 3.5);
    ctx.stroke();
  });
  const cell = 2;
  const glyph = GLYPH_SIZE * cell;
  withGlow(p, color, 2, () => drawGlyph(p, PIXEL_GLYPHS[kind], (size - glyph) / 2, (size - glyph) / 2, cell, lighten(color, 0.45)));
}

// ---------------------------------------------------------------- lasers and barrier

/** 4x18 bolt, white core, magenta glow baked around it. */
export function paintLaserBolt(p: Paint): void {
  const { ctx } = p;
  const pad = LaserArt.GLOW_PAD;
  const w = LaserArt.BOLT_WIDTH;
  const h = LaserArt.BOLT_HEIGHT;
  withGlow(p, '#ff2e88', 3.5, () => {
    roundRectPath(ctx, pad, pad, w, h, w / 2);
    ctx.fillStyle = linear(ctx, pad, 0, pad + w, 0, [
      [0, '#ff2e88'],
      [0.5, '#ffd6ea'],
      [1, '#ff2e88'],
    ]);
    ctx.fill();
  });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(pad + w / 2 - 0.75, pad + 1, 1.5, h - 3);
  ctx.fillStyle = radial(ctx, pad + w / 2, pad + 1.5, 3, [
    [0, '#ffffff'],
    [1, rgba('#ffffff', 0)],
  ]);
  ctx.fillRect(pad - 2, pad - 2, w + 4, 6);
}

const BARRIER_COLOR = '#2fe6c8';

/** One PERIOD of the barrier; the factory repeats it at whole texture pixels, so it tiles exactly. */
export function paintBarrierTile(scale: number): HTMLCanvasElement {
  const p = createPaint(BarrierArt.PERIOD, BarrierArt.HEIGHT, scale);
  const { ctx, w, h, px } = p;
  const c = BARRIER_COLOR;
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, rgba(c, 0)],
    [0.3, rgba(c, 0.3)],
    [0.43, rgba(c, 0.85)],
    [0.5, '#ffffff'],
    [0.57, rgba(c, 0.85)],
    [0.7, rgba(c, 0.3)],
    [1, rgba(c, 0)],
  ]);
  ctx.fillRect(0, 0, w, h);
  // Energy cells along the line.
  for (const x of [8, 24]) {
    ctx.fillStyle = rgba('#ffffff', 0.75);
    ctx.beginPath();
    ctx.moveTo(x, h / 2 - 3);
    ctx.lineTo(x + 2.5, h / 2);
    ctx.lineTo(x, h / 2 + 3);
    ctx.lineTo(x - 2.5, h / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = rgba(lighten(c, 0.5), 0.5);
  ctx.fillRect(16 - px / 2, h / 2 - 4, px, 8);
  return p.canvas;
}

// ---------------------------------------------------------------- particles

/** A small glass shard, white to grey so a tint keeps its shading. */
export function paintShard(p: Paint): void {
  const { ctx, px } = p;
  ctx.beginPath();
  ctx.moveTo(1, 1.2);
  ctx.lineTo(7, 2.8);
  ctx.lineTo(3, 7);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, 1, 1, 6, 7, [
    [0, '#ffffff'],
    [1, '#a4a9bc'],
  ]);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = px;
  ctx.beginPath();
  ctx.moveTo(1, 1.2);
  ctx.lineTo(7, 2.8);
  ctx.stroke();
}

/** Shockwave ring: transparent middle, soft white band. */
export function paintRing(p: Paint): void {
  const { ctx } = p;
  const c = p.w / 2;
  ctx.fillStyle = radial(ctx, c, c, c, [
    [0, rgba('#ffffff', 0)],
    [0.62, rgba('#ffffff', 0)],
    [0.8, rgba('#ffffff', 0.95)],
    [0.86, rgba('#ffffff', 0.7)],
    [1, rgba('#ffffff', 0)],
  ]);
  ctx.fillRect(0, 0, p.w, p.h);
}

/** Four-point star flare with a soft centre, for perfect hits. */
export function paintFlare(p: Paint): void {
  const { ctx } = p;
  const c = p.w / 2;
  ctx.fillStyle = radial(ctx, c, c, c * 0.55, [
    [0, '#ffffff'],
    [0.2, rgba('#ffffff', 0.9)],
    [1, rgba('#ffffff', 0)],
  ]);
  ctx.fillRect(0, 0, p.w, p.h);
  const ray = (length: number, width: number, angle: number, alpha: number) => {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(angle);
    ctx.fillStyle = linear(ctx, -length, 0, length, 0, [
      [0, rgba('#ffffff', 0)],
      [0.5, rgba('#ffffff', alpha)],
      [1, rgba('#ffffff', 0)],
    ]);
    ctx.beginPath();
    ctx.moveTo(-length, 0);
    ctx.lineTo(0, -width);
    ctx.lineTo(length, 0);
    ctx.lineTo(0, width);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  ray(c, 1.6, 0, 1);
  ray(c, 1.6, Math.PI / 2, 1);
  ray(c * 0.55, 1, Math.PI / 4, 0.6);
  ray(c * 0.55, 1, -Math.PI / 4, 0.6);
  // Solid white-hot centre: without it the stacked soft layers land at 254.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(c, c, 1.5, 0, Math.PI * 2);
  ctx.fill();
}
