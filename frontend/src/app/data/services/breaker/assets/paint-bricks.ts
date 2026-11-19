import { BrickArt } from '@app/data/models/breaker/BreakerKeys';
import { darken, lighten, mix, rgba } from './color';
import { QUESTION_GLYPH, GLYPH_SIZE } from './pixel-glyphs';
import { clipped, drawGlyph, linear, Paint, pathOf, radial, roundRectPath, seededRandom, withGlow } from './paint';

/** Bricks: 66x26 world, painted edge to edge (the grid gap is the 4 px between them). */

const R = BrickArt.RADIUS;
/** Width of the bright rim around the glass body. */
const RIM = 1.5;

function outerPath(p: Paint): void {
  roundRectPath(p.ctx, 0, 0, p.w, p.h, R);
}

function bodyPath(p: Paint): void {
  roundRectPath(p.ctx, RIM, RIM, p.w - 2 * RIM, p.h - 2 * RIM, R - 1);
}

/** The top gloss of every glass brick: a bright band fading out before the middle. */
function gloss(p: Paint, strength: number): void {
  const { ctx, w, h } = p;
  clipped(
    p,
    () => bodyPath(p),
    () => {
      ctx.fillStyle = linear(ctx, 0, RIM, 0, h * 0.5, [
        [0, rgba('#ffffff', 0.42 * strength)],
        [0.55, rgba('#ffffff', 0.1 * strength)],
        [1, rgba('#ffffff', 0)],
      ]);
      ctx.fillRect(0, 0, w, h * 0.5);
    },
  );
}

/** A 1 px light edge along the top and a fainter one down the left: the "sharp light edge". */
function lightEdges(p: Paint, color: string): void {
  const { ctx, w, h, px } = p;
  ctx.fillStyle = rgba(color, 0.95);
  ctx.fillRect(RIM + R - 1, RIM, w - 2 * (RIM + R - 1), px);
  ctx.fillStyle = rgba(color, 0.4);
  ctx.fillRect(RIM, RIM + R - 1, px, h - 2 * (RIM + R - 1));
}

/** A dark 1 px outline, so neighbours of the same tone still read as separate bricks. */
function outline(p: Paint, color: string): void {
  const { ctx, w, h, px } = p;
  ctx.strokeStyle = color;
  ctx.lineWidth = px;
  roundRectPath(ctx, px / 2, px / 2, w - px, h - px, R);
  ctx.stroke();
}

/** The glassy neon tile of one tone. */
export function paintToneBrick(p: Paint, tone: string): void {
  const { ctx, w, h, px } = p;

  // Rim: light on top, dark at the bottom (bevel).
  outerPath(p);
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, lighten(tone, 0.6)],
    [0.45, tone],
    [1, darken(tone, 0.5)],
  ]);
  ctx.fill();

  // Glass body.
  bodyPath(p);
  ctx.fillStyle = linear(ctx, 0, RIM, 0, h - RIM, [
    [0, mix(tone, '#ffffff', 0.18)],
    [0.42, tone],
    [0.58, darken(tone, 0.2)],
    [1, darken(tone, 0.58)],
  ]);
  ctx.fill();

  clipped(
    p,
    () => bodyPath(p),
    () => {
      // Inner glow hugging the rim.
      withGlow(p, lighten(tone, 0.5), 4, () => {
        ctx.strokeStyle = rgba(lighten(tone, 0.45), 0.85);
        ctx.lineWidth = 1.5;
        roundRectPath(ctx, RIM - 0.5, RIM - 0.5, w - 2 * RIM + 1, h - 2 * RIM + 1, R);
        ctx.stroke();
      });
      // Subtle diagonal grain.
      ctx.strokeStyle = rgba('#ffffff', 0.07);
      ctx.lineWidth = px;
      for (let x = -h; x < w + h; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + h, 0);
        ctx.stroke();
      }
      // Bottom bevel.
      ctx.fillStyle = linear(ctx, 0, h - RIM - 4, 0, h - RIM, [
        [0, rgba(darken(tone, 0.7), 0)],
        [1, rgba(darken(tone, 0.7), 0.6)],
      ]);
      ctx.fillRect(0, h - RIM - 4, w, 4);
    },
  );

  gloss(p, 1);
  lightEdges(p, lighten(tone, 0.8));

  // Specular glint, top left.
  ctx.fillStyle = radial(ctx, 7, 5, 5, [
    [0, rgba('#ffffff', 0.85)],
    [0.35, rgba('#ffffff', 0.25)],
    [1, rgba('#ffffff', 0)],
  ]);
  ctx.fillRect(0, 0, 14, 10);

  outline(p, rgba(darken(tone, 0.75), 0.9));
}

/** White rounded rect, same outline as a brick: the scene fades it with flashMs. */
export function paintFlash(p: Paint): void {
  outerPath(p);
  p.ctx.fillStyle = '#ffffff';
  p.ctx.fill();
}

type Point = readonly [number, number];

/** A jagged crack from `from`, heading at `angle`, that forks once. */
function crackLines(random: () => number, from: Point, angle: number, length: number, depth: number): Point[][] {
  const lines: Point[][] = [];
  const line: Point[] = [from];
  let [x, y] = from;
  let heading = angle;
  const steps = 4 + Math.floor(random() * 3);
  for (let i = 0; i < steps; i++) {
    heading += (random() - 0.5) * 0.9;
    const step = length / steps;
    x += Math.cos(heading) * step;
    y += Math.sin(heading) * step;
    line.push([x, y]);
    if (depth > 0 && i === 1) {
      lines.push(...crackLines(random, [x, y], heading + (random() > 0.5 ? 0.9 : -0.9), length * 0.45, depth - 1));
    }
  }
  lines.push(line);
  return lines;
}

function strokeCracks(p: Paint, lines: Point[][]): void {
  const { ctx, px } = p;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [width, color, dy] of [
    [px * 3, rgba('#07060d', 0.55), px],
    [px * 1.4, rgba('#ffffff', 0.95), 0],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const line of lines) {
      ctx.beginPath();
      line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y + dy) : ctx.lineTo(x, y + dy)));
      ctx.stroke();
    }
  }
}

function crackSet(level: 1 | 2): Point[][] {
  const random = seededRandom(0xc7ac);
  const origin: Point = [27, 12];
  const lines = [
    ...crackLines(random, origin, -0.35, 30, 1),
    ...crackLines(random, origin, Math.PI + 0.4, 22, 1),
    ...crackLines(random, origin, 1.9, 12, 0),
  ];
  if (level === 2) {
    const second: Point = [46, 15];
    lines.push(
      ...crackLines(random, second, -1.6, 14, 1),
      ...crackLines(random, second, 0.3, 20, 1),
      ...crackLines(random, second, 2.6, 18, 1),
      ...crackLines(random, origin, -2.2, 12, 0),
    );
  }
  return lines;
}

/** Transparent overlay with bright cracks: crack-1 after one hit, crack-2 after two. */
export function paintCracks(p: Paint, level: 1 | 2): void {
  const { ctx } = p;
  clipped(
    p,
    () => roundRectPath(ctx, 1, 1, p.w - 2, p.h - 2, R),
    () => {
      strokeCracks(p, crackSet(level));
      if (level === 2) {
        // Chipped corners: little bright shards where the glass broke off.
        ctx.fillStyle = rgba('#ffffff', 0.7);
        for (const [x, y, s] of [
          [44, 13, 2.2],
          [25, 10, 1.6],
          [53, 20, 1.4],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(x, y - s);
          ctx.lineTo(x + s, y + s * 0.6);
          ctx.lineTo(x - s * 0.7, y + s * 0.4);
          ctx.closePath();
          ctx.fill();
        }
      }
    },
  );
}

function rivet(p: Paint, x: number, y: number, r: number): void {
  const { ctx } = p;
  ctx.fillStyle = rgba('#000000', 0.45);
  ctx.beginPath();
  ctx.arc(x + 0.4, y + 0.5, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = radial(ctx, x, y, r, [
    [0, '#ffffff'],
    [0.35, '#c9cfde'],
    [1, '#4a5064'],
  ], x - r * 0.35, y - r * 0.35, 0);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

const METAL: readonly (readonly [number, string])[] = [
  [0, '#e3e8f4'],
  [0.4, '#9ca4ba'],
  [0.6, '#6b7389'],
  [1, '#353a4c'],
];

/** Riveted plate frame for armored bricks: the tone shows through its window. */
export function paintArmorPlate(p: Paint): void {
  const { ctx, w, h, px } = p;
  const bx = 6;
  const by = 5;
  // Frame with a window (even-odd fill).
  const frame = new Path2D();
  frame.addPath(pathOf(1, 1, w - 2, h - 2, R));
  frame.addPath(pathOf(bx, by, w - 2 * bx, h - 2 * by, 2));
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, METAL);
  ctx.globalAlpha = 0.94;
  ctx.fill(frame, 'evenodd');
  ctx.globalAlpha = 1;

  // Bevel: light top edge of the frame, dark edge of the window.
  ctx.strokeStyle = rgba('#ffffff', 0.7);
  ctx.lineWidth = px;
  ctx.beginPath();
  ctx.moveTo(R + 1, 1 + px / 2);
  ctx.lineTo(w - R - 1, 1 + px / 2);
  ctx.stroke();
  ctx.strokeStyle = rgba('#07060d', 0.75);
  ctx.lineWidth = px * 2;
  ctx.stroke(pathOf(bx, by, w - 2 * bx, h - 2 * by, 2));

  // Brushed lines on the plate.
  const random = seededRandom(0xa2302);
  clipped(
    p,
    () => {
      ctx.beginPath();
      ctx.rect(0, 0, w, by);
      ctx.rect(0, h - by, w, by);
    },
    () => {
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = rgba(random() > 0.5 ? '#ffffff' : '#000000', 0.08 + random() * 0.1);
        ctx.fillRect(random() * w * 0.6, random() * h, 10 + random() * 30, px);
      }
    },
  );

  for (const [x, y] of [
    [3.5, 3.5],
    [w - 3.5, 3.5],
    [3.5, h - 3.5],
    [w - 3.5, h - 3.5],
    [w / 2, 2.6],
    [w / 2, h - 2.6],
  ] as const) {
    rivet(p, x, y, 1.6);
  }
}

/** Brushed steel with a double frame and rivets: clearly unbreakable. */
export function paintSteel(p: Paint): void {
  const { ctx, w, h, px } = p;
  outerPath(p);
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, METAL);
  ctx.fill();

  const random = seededRandom(0x57ee1);
  clipped(
    p,
    () => outerPath(p),
    () => {
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = rgba(random() > 0.45 ? '#ffffff' : '#1a1d28', 0.05 + random() * 0.12);
        ctx.fillRect(random() * w - 10, random() * h, 8 + random() * 40, px);
      }
      // Cold blue sheen across the plate.
      ctx.fillStyle = linear(ctx, 0, 0, w, h, [
        [0, rgba('#a9c6ff', 0)],
        [0.45, rgba('#a9c6ff', 0.18)],
        [0.55, rgba('#ffffff', 0.22)],
        [0.65, rgba('#a9c6ff', 0)],
      ]);
      ctx.fillRect(0, 0, w, h);
    },
  );

  // Engraved inner frame: dark groove with a light lip under it.
  const inset = 5;
  ctx.lineWidth = px * 2;
  ctx.strokeStyle = rgba('#1a1d28', 0.7);
  ctx.stroke(pathOf(inset, inset - 0.5, w - 2 * inset, h - 2 * inset, 2));
  ctx.lineWidth = px;
  ctx.strokeStyle = rgba('#ffffff', 0.45);
  ctx.stroke(pathOf(inset, inset + 0.5, w - 2 * inset, h - 2 * inset, 2));

  // Bevel of the outer edge.
  ctx.fillStyle = rgba('#ffffff', 0.85);
  ctx.fillRect(R, 0.5, w - 2 * R, px);
  ctx.fillStyle = rgba('#0c0e16', 0.6);
  ctx.fillRect(R, h - 0.5 - px, w - 2 * R, px);

  for (const [x, y] of [
    [2.8, 2.8],
    [w - 2.8, 2.8],
    [2.8, h - 2.8],
    [w - 2.8, h - 2.8],
  ] as const) {
    rivet(p, x, y, 1.5);
  }
  outline(p, rgba('#0c0e16', 0.95));
}

/** Dark core with warning chevrons pointing at a hot center. */
export function paintExplosive(p: Paint): void {
  const { ctx, w, h } = p;
  outerPath(p);
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, '#4a1a10'],
    [0.5, '#260b07'],
    [1, '#120404'],
  ]);
  ctx.fill();

  clipped(
    p,
    () => bodyPath(p),
    () => {
      // Chevrons on both ends, pointing in.
      ctx.fillStyle = '#ff9a3d';
      for (const side of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const tip = w / 2 + side * (16 + i * 7);
          const back = tip + side * 5;
          ctx.beginPath();
          ctx.moveTo(back, 2);
          ctx.lineTo(back + side * 3, 2);
          ctx.lineTo(tip + side * 3, h / 2);
          ctx.lineTo(back + side * 3, h - 2);
          ctx.lineTo(back, h - 2);
          ctx.lineTo(tip, h / 2);
          ctx.closePath();
          ctx.fillStyle = i === 0 ? '#ffb13d' : '#ff5c2c';
          ctx.fill();
        }
      }
      // Hazard stripes at the very ends.
      ctx.fillStyle = rgba('#ffe14a', 0.85);
      for (let x = -h; x < 9; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + 3, h);
        ctx.lineTo(x + 3 + h, 0);
        ctx.lineTo(x + h, 0);
        ctx.closePath();
        ctx.fill();
      }
      for (let x = w - 9; x < w + h; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 3, 0);
        ctx.lineTo(x + 3 + h, h);
        ctx.lineTo(x + h, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = rgba('#120404', 0.85);
      ctx.fillRect(9, 0, 2, h);
      ctx.fillRect(w - 11, 0, 2, h);
    },
  );

  // Hot core.
  withGlow(p, '#ff7a1c', 6, () => {
    ctx.fillStyle = radial(ctx, w / 2, h / 2, 10, [
      [0, '#fffbe0'],
      [0.3, '#ffd36a'],
      [0.65, '#ff7a1c'],
      [1, '#b3240a'],
    ]);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 7.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = rgba('#ffffff', 0.9);
  ctx.beginPath();
  ctx.arc(w / 2 - 2.2, h / 2 - 2.4, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Glowing rim.
  withGlow(p, '#ff5c2c', 3, () => {
    ctx.strokeStyle = '#ff7a3d';
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, 0.9, 0.9, w - 1.8, h - 1.8, R);
    ctx.stroke();
  });
  gloss(p, 0.5);
  outline(p, rgba('#120404', 0.95));
}

/** Dark violet glass with a glowing "?": always drops a capsule. */
export function paintCapsuleBrick(p: Paint): void {
  const { ctx, w, h } = p;
  const rim = '#ffe14a';
  outerPath(p);
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, lighten(rim, 0.5)],
    [0.5, rim],
    [1, darken(rim, 0.55)],
  ]);
  ctx.fill();
  bodyPath(p);
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, '#4a2a86'],
    [0.5, '#2a1656'],
    [1, '#140a2c'],
  ]);
  ctx.fill();

  clipped(
    p,
    () => bodyPath(p),
    () => {
      withGlow(p, rim, 4, () => {
        ctx.strokeStyle = rgba(rim, 0.8);
        ctx.lineWidth = 1.2;
        roundRectPath(ctx, RIM - 0.5, RIM - 0.5, w - 2 * RIM + 1, h - 2 * RIM + 1, R);
        ctx.stroke();
      });
      // A soft yellow light behind the glyph.
      ctx.fillStyle = radial(ctx, w / 2, h / 2, 16, [
        [0, rgba(rim, 0.35)],
        [1, rgba(rim, 0)],
      ]);
      ctx.fillRect(0, 0, w, h);
      // Side lights.
      ctx.fillStyle = rgba(rim, 0.75);
      for (const x of [9, w - 11]) {
        for (const y of [9, 12, 15]) {
          ctx.fillRect(x, y, 2, 1.5);
        }
      }
    },
  );

  const cell = 2.5;
  const size = GLYPH_SIZE * cell;
  withGlow(p, rim, 5, () => drawGlyph(p, QUESTION_GLYPH, (w - size) / 2, (h - size) / 2, cell, '#fff6c2'));
  gloss(p, 0.8);
  lightEdges(p, '#fffbe6');
  outline(p, rgba('#140a2c', 0.95));
}

const RAINBOW = ['#ff5c5c', '#ff9a3d', '#ffe14a', '#5dfc9a', '#5ee6ff', '#66b2ff', '#b78bff', '#ff2e88'];

/** Faceted crystal with a rainbow refraction. */
export function paintPrism(p: Paint): void {
  const { ctx, w, h, px } = p;
  outerPath(p);
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, '#ffffff'],
    [0.5, '#cfe0ff'],
    [1, '#7f93d6'],
  ]);
  ctx.fill();

  const top: Point[] = [[0, 0], [w * 0.28, 0], [w * 0.6, 0], [w, 0]];
  const mid: Point[] = [[0, h * 0.55], [w * 0.16, h * 0.45], [w * 0.44, h * 0.6], [w * 0.76, h * 0.4], [w, h * 0.5]];
  const bottom: Point[] = [[0, h], [w * 0.3, h], [w * 0.58, h], [w * 0.86, h], [w, h]];
  const facets: Point[][] = [
    [top[0], top[1], mid[1]],
    [top[0], mid[1], mid[0]],
    [top[1], mid[2], mid[1]],
    [top[1], top[2], mid[2]],
    [top[2], mid[3], mid[2]],
    [top[2], top[3], mid[3]],
    [top[3], mid[4], mid[3]],
    [mid[0], mid[1], bottom[1]],
    [mid[0], bottom[1], bottom[0]],
    [mid[1], mid[2], bottom[1]],
    [mid[2], bottom[2], bottom[1]],
    [mid[2], mid[3], bottom[2]],
    [mid[3], bottom[3], bottom[2]],
    [mid[3], mid[4], bottom[3]],
    [mid[4], bottom[4], bottom[3]],
  ];

  clipped(
    p,
    () => bodyPath(p),
    () => {
      facets.forEach((facet, i) => {
        const cx = (facet[0][0] + facet[1][0] + facet[2][0]) / 3;
        const color = RAINBOW[Math.floor((cx / w) * RAINBOW.length) % RAINBOW.length];
        ctx.fillStyle = rgba(color, 0.28 + (i % 3) * 0.12);
        ctx.beginPath();
        ctx.moveTo(facet[0][0], facet[0][1]);
        ctx.lineTo(facet[1][0], facet[1][1]);
        ctx.lineTo(facet[2][0], facet[2][1]);
        ctx.closePath();
        ctx.fill();
      });
      // Refraction band sweeping across.
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = linear(
        ctx,
        0,
        h,
        w,
        0,
        RAINBOW.map((color, i) => [i / (RAINBOW.length - 1), rgba(color, 0.4)] as const),
      );
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      // Facet edges.
      ctx.strokeStyle = rgba('#ffffff', 0.7);
      ctx.lineWidth = px;
      for (const facet of facets) {
        ctx.beginPath();
        ctx.moveTo(facet[0][0], facet[0][1]);
        ctx.lineTo(facet[1][0], facet[1][1]);
        ctx.lineTo(facet[2][0], facet[2][1]);
        ctx.closePath();
        ctx.stroke();
      }
    },
  );

  // Sparkles.
  for (const [x, y, s] of [
    [w * 0.28, 4, 3],
    [w * 0.76, h * 0.4, 2.4],
  ] as const) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.25, y - s * 0.25);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s * 0.25, y + s * 0.25);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.25, y + s * 0.25);
    ctx.lineTo(x - s, y);
    ctx.lineTo(x - s * 0.25, y - s * 0.25);
    ctx.closePath();
    ctx.fill();
  }

  withGlow(p, '#5ee6ff', 3, () => {
    ctx.strokeStyle = rgba('#ffffff', 0.95);
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, 0.8, 0.8, w - 1.6, h - 1.6, R);
    ctx.stroke();
  });
  gloss(p, 0.6);
  outline(p, rgba('#3a3f7a', 0.9));
}
