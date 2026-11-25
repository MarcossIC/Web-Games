import type { Board, Bounds, Clip, Piece, Ring, Rod } from '@app/data/services/ringout/engine/board';
import {
  ARM,
  CLAMP_LENGTH,
  CLAMP_WIDTH,
  CLIP_LENGTH,
  CLIP_WIDTH,
  TUBE,
} from '@app/data/services/ringout/engine/config';
import { angleOf, polar, seededRandom, type Vec } from '@app/data/services/ringout/engine/geometry';
import type { PieceColor } from '@app/data/services/ringout/engine/types';
import { TONES, type Tone } from './ringout-palette';

/** Room left around the pieces, in CSS pixels, when the board is fitted to the canvas. */
const FIT_PADDING_PX = 18;
/** The largest a board unit is drawn: small levels do not grow into toys. */
const MAX_UNIT_PX = 1.9;
/** Where the hard shadow falls, in board units. */
const SHADOW = { x: 3.5, y: 4.5 };
const SHADOW_COLOR = 'rgba(4, 2, 12, 0.6)';
const GRAVITY = 620;
const CHEERS = ['Nice!', 'Great!', 'Free!', 'Cool!', 'Out!'];

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  turn: number;
  size: number;
  /** The corners, as angle and length (times `size`). */
  corners: readonly (readonly [number, number])[];
  tone: Tone;
  age: number;
  life: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  age: number;
  life: number;
}

interface Pulse {
  age: number;
  life: number;
  amp: number;
}

/** A key for a piece in the maps of what is shaking. */
export function pieceKey(piece: Piece): string {
  return `${piece.kind}:${piece.id}`;
}

/**
 * The things that happen on top of the rules: pieces breaking into shards,
 * words that float up, pieces that shake and clips that flash. Times are in
 * seconds and distances in board units.
 */
export class RingOutEffects {
  readonly shards: Shard[] = [];
  readonly popups: Popup[] = [];
  readonly shakes = new Map<string, Pulse>();
  readonly flashes = new Map<number, Pulse>();
  private readonly random: () => number;
  private cheer = 0;
  /** Which way is down on the screen, on the board: the board may be drawn turned. */
  down: Vec = { x: 0, y: 1 };

  constructor(seed = 7) {
    this.random = seededRandom(seed);
  }

  /** Something is still moving: the board must be drawn again. */
  get active(): boolean {
    return this.shards.length > 0 || this.popups.length > 0 || this.shakes.size > 0 || this.flashes.size > 0;
  }

  clear(): void {
    this.shards.length = 0;
    this.popups.length = 0;
    this.shakes.clear();
    this.flashes.clear();
  }

  /** A ring breaks: shards all along its tube, flying out from its middle. */
  breakRing(board: Board, ring: Ring): void {
    const points = board.arcPoints(ring);
    const every = Math.max(1, Math.round(points.length / Math.max(10, Math.round(ring.radius / 3))));
    for (let i = 0; i < points.length; i += every) {
      const p = points[i];
      const out = angleOf(ring.center, p);
      this.addShard(p, out, TONES[ring.color], 1);
    }
    this.popups.push({ x: ring.center.x, y: ring.center.y, text: this.nextCheer(), age: 0, life: 1 });
  }

  /** A rod breaks once out of its clamp. */
  breakRod(points: readonly Vec[], color: PieceColor): void {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 12));
      for (let k = 0; k <= n; k++) {
        const p = { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n };
        this.addShard(p, this.random() * Math.PI * 2, TONES[color], 0.9);
      }
    }
  }

  /** A clip lets go: its arm and sleeve snap into a few small shards. */
  breakClip(clip: Clip, color: PieceColor): void {
    const tone = TONES[color];
    for (let k = 0; k <= 3; k++) {
      const p = {
        x: clip.weld.x + ((clip.sleeve.x - clip.weld.x) * k) / 3,
        y: clip.weld.y + ((clip.sleeve.y - clip.weld.y) * k) / 3,
      };
      this.addShard(p, angleOf(clip.weld, clip.sleeve) + (this.random() - 0.5) * 2, tone, 0.6);
    }
  }

  shake(piece: Piece, amp = 3): void {
    this.shakes.set(pieceKey(piece), { age: 0, life: 0.35, amp });
  }

  flashClip(id: number): void {
    this.flashes.set(id, { age: 0, life: 0.6, amp: 1 });
  }

  /** How far a piece is pushed sideways by its shake right now. */
  shakeOffset(key: string): number {
    const pulse = this.shakes.get(key);
    if (!pulse) return 0;
    const fade = 1 - pulse.age / pulse.life;
    return Math.sin(pulse.age * 55) * pulse.amp * fade;
  }

  /** How bright a clip's flash is right now, 0 to 1. */
  flashOf(id: number): number {
    const pulse = this.flashes.get(id);
    if (!pulse) return 0;
    return Math.max(0, Math.sin((pulse.age / pulse.life) * Math.PI * 3)) * (1 - pulse.age / pulse.life);
  }

  step(dt: number): void {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.age += dt;
      if (s.age >= s.life) {
        this.shards.splice(i, 1);
        continue;
      }
      s.vx += GRAVITY * this.down.x * dt;
      s.vy += GRAVITY * this.down.y * dt;
      s.vx *= 1 - 0.8 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.turn += s.spin * dt;
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.age += dt;
      if (p.age >= p.life) this.popups.splice(i, 1);
    }
    for (const map of [this.shakes, this.flashes]) {
      for (const [key, pulse] of map) {
        pulse.age += dt;
        if (pulse.age >= pulse.life) map.delete(key as never);
      }
    }
  }

  private addShard(at: Vec, heading: number, tone: Tone, power: number): void {
    const r = this.random;
    const speed = (90 + r() * 170) * power;
    const kick = (120 + r() * 140) * power;
    const sides = 5 + Math.floor(r() * 2);
    const corners = Array.from({ length: sides }, (_, i) => [
      (i / sides) * Math.PI * 2 + (r() - 0.5) * 0.7,
      0.65 + r() * 0.45,
    ] as const);
    this.shards.push({
      x: at.x,
      y: at.y,
      vx: Math.cos(heading) * speed + (r() - 0.5) * 60 - this.down.x * kick,
      vy: Math.sin(heading) * speed + (r() - 0.5) * 60 - this.down.y * kick,
      spin: (r() - 0.5) * 14,
      turn: r() * Math.PI * 2,
      size: (5 + r() * 4.5) * (0.75 + power * 0.25),
      corners,
      tone,
      age: 0,
      life: 0.9 + r() * 0.5,
    });
  }

  private nextCheer(): string {
    const word = CHEERS[this.cheer % CHEERS.length];
    this.cheer += 1 + Math.floor(this.random() * 2);
    return word;
  }
}

/** What the painter highlights besides the board itself. */
export interface Focus {
  /** The piece under the finger or the mouse. */
  readonly active?: Piece | null;
  /** The piece the hint points at. */
  readonly hint?: Piece | null;
  /** Seconds, for what pulses. */
  readonly time: number;
}

/**
 * Draws a Ring Out board on a canvas: glossy tubes with a hard shadow, in
 * the style of the site. The board is fitted to the canvas once per level
 * (`fit`), so pieces do not jump as others leave.
 */
export class RingOutPainter {
  private readonly ctx: CanvasRenderingContext2D;
  private cssWidth = 1;
  private cssHeight = 1;
  private ratio = 1;
  private bounds: Bounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  /** CSS pixels per board unit. */
  private unitPx = 1;
  private originX = 0;
  private originY = 0;
  /** The board is drawn a quarter turn clockwise: a wide level on a tall screen. */
  private turned = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D canvas.');
    this.ctx = ctx;
  }

  /** CSS pixels per board unit. */
  get unit(): number {
    return this.unitPx;
  }

  resize(cssWidth: number, cssHeight: number, ratio: number): void {
    this.cssWidth = Math.max(1, cssWidth);
    this.cssHeight = Math.max(1, cssHeight);
    this.ratio = ratio;
    this.canvas.width = Math.round(this.cssWidth * ratio);
    this.canvas.height = Math.round(this.cssHeight * ratio);
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;
    this.refit();
  }

  fit(bounds: Bounds): void {
    this.bounds = bounds;
    this.refit();
  }

  /** A point on the canvas, in CSS pixels from its corner, on the board. */
  toBoard(x: number, y: number): Vec {
    const v = { x: (x - this.originX) / this.unitPx, y: (y - this.originY) / this.unitPx };
    return this.turned ? { x: v.y, y: -v.x } : v;
  }

  /** A point of the board on the canvas, in CSS pixels from its corner. */
  toScreen(p: Vec): Vec {
    const v = this.turned ? { x: -p.y, y: p.x } : p;
    return { x: v.x * this.unitPx + this.originX, y: v.y * this.unitPx + this.originY };
  }

  /** A direction on the screen as a direction on the board. */
  screenToBoard(v: Vec): Vec {
    return this.turned ? { x: v.y, y: -v.x } : v;
  }

  draw(board: Board, fx: RingOutEffects, focus: Focus): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const k = this.unitPx * this.ratio;
    ctx.setTransform(k, 0, 0, k, this.originX * this.ratio, this.originY * this.ratio);
    if (this.turned) ctx.transform(0, 1, -1, 0, 0, 0);
    fx.down = this.screenToBoard({ x: 0, y: 1 });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Hard shadows first, all together, so no shadow falls on a tube.
    ctx.save();
    const shadow = this.screenToBoard(SHADOW);
    ctx.translate(shadow.x, shadow.y);
    for (const ring of board.rings) if (ring.alive) this.withShake(fx, ring, () => this.ringShadow(ring));
    for (const rod of board.rods) if (rod.alive) this.rodShadow(board, rod, fx);
    for (const clip of board.clips) if (clip.alive) this.clipShadow(clip, board, fx);
    ctx.restore();

    // Glow under the piece that is pointed at.
    for (const [piece, color] of [
      [focus.hint, `rgba(255, 225, 74, ${0.55 + 0.35 * Math.sin(focus.time * 6)})`],
      [focus.active, 'rgba(94, 230, 255, 0.9)'],
    ] as const) {
      if (piece) this.glow(board, piece, color, fx);
    }

    for (const ring of board.rings) if (ring.alive) this.withShake(fx, ring, () => this.ringTube(ring));
    for (const rod of board.rods) if (rod.alive) this.rodTube(board, rod, fx);
    for (const clip of board.clips) if (clip.alive) this.clipPiece(clip, board, fx);
    for (const rod of board.rods) if (rod.alive) this.clampPiece(rod);

    this.drawShards(fx);
    this.drawPopups(fx);
  }

  // ---- Layout -------------------------------------------------------

  private refit(): void {
    const b = this.bounds;
    const room = (size: number) => Math.max(1, size - FIT_PADDING_PX * 2);
    const unitFor = (w: number, h: number) =>
      Math.min(room(this.cssWidth) / Math.max(1, w), room(this.cssHeight) / Math.max(1, h), MAX_UNIT_PX);
    const upright = unitFor(b.maxX - b.minX, b.maxY - b.minY);
    const sideways = unitFor(b.maxY - b.minY, b.maxX - b.minX);
    // Turned a quarter, the board is drawn as (-y, x).
    this.turned = sideways > upright * 1.15;
    const v = this.turned ? { minX: -b.maxY, maxX: -b.minY, minY: b.minX, maxY: b.maxX } : b;
    this.unitPx = this.turned ? sideways : upright;
    this.originX = (this.cssWidth - (v.maxX - v.minX) * this.unitPx) / 2 - v.minX * this.unitPx;
    this.originY = (this.cssHeight - (v.maxY - v.minY) * this.unitPx) / 2 - v.minY * this.unitPx;
  }

  // ---- Pieces -------------------------------------------------------

  private ringPath(ring: Ring): void {
    const ctx = this.ctx;
    ctx.beginPath();
    if (ring.gapHalf <= 0) {
      ctx.arc(ring.center.x, ring.center.y, ring.radius, 0, Math.PI * 2);
    } else {
      ctx.arc(
        ring.center.x,
        ring.center.y,
        ring.radius,
        ring.angle + ring.gapHalf,
        ring.angle - ring.gapHalf + Math.PI * 2
      );
    }
  }

  private ringShadow(ring: Ring): void {
    this.ringPath(ring);
    this.ctx.strokeStyle = SHADOW_COLOR;
    this.ctx.lineWidth = TUBE;
    this.ctx.stroke();
  }

  private ringTube(ring: Ring): void {
    this.tube(() => this.ringPath(ring), TONES[ring.color], TUBE);
  }

  /**
   * A tube along the current path: a shaded edge, the color, and a shine
   * shifted up and left, as if lit from there.
   */
  private tube(path: () => void, tone: Tone, width: number): void {
    const ctx = this.ctx;
    path();
    ctx.strokeStyle = tone.dark;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.strokeStyle = tone.base;
    ctx.lineWidth = width * 0.7;
    ctx.stroke();
    ctx.save();
    const shine = this.screenToBoard({ x: -width * 0.13, y: -width * 0.13 });
    ctx.translate(shine.x, shine.y);
    path();
    ctx.strokeStyle = tone.light;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = width * 0.2;
    ctx.stroke();
    ctx.restore();
  }

  private rodPath(points: readonly Vec[]): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  }

  private shakenRodPoints(board: Board, rod: Rod, fx: RingOutEffects): Vec[] {
    const shift = fx.shakeOffset(pieceKey({ kind: 'rod', id: rod.id }));
    return board.rodPoints(rod).map((p) => ({ x: p.x + rod.direction.x * shift, y: p.y + rod.direction.y * shift }));
  }

  private rodShadow(board: Board, rod: Rod, fx: RingOutEffects): void {
    const ctx = this.ctx;
    this.rodPath(this.shakenRodPoints(board, rod, fx));
    ctx.strokeStyle = SHADOW_COLOR;
    ctx.lineWidth = TUBE;
    ctx.stroke();
    this.clampShape(rod);
    ctx.fillStyle = SHADOW_COLOR;
    ctx.fill();
  }

  private rodTube(board: Board, rod: Rod, fx: RingOutEffects): void {
    const points = this.shakenRodPoints(board, rod, fx);
    const tone = TONES[rod.color];
    this.tube(() => this.rodPath(points), tone, TUBE);

    // A chevron near the end it leads with: the way it slides.
    const ctx = this.ctx;
    const d = rod.direction;
    const lead = points[points.length - 1];
    const head = points[1];
    const tip = points.length > 2 ? { x: (head.x + lead.x) / 2, y: (head.y + lead.y) / 2 } : head;
    const at = points.length > 2 ? tip : { x: tip.x - d.x * 14, y: tip.y - d.y * 14 };
    const n = { x: -d.y, y: d.x };
    const s = 3.2;
    ctx.beginPath();
    ctx.moveTo(at.x - d.x * s + n.x * s, at.y - d.y * s + n.y * s);
    ctx.lineTo(at.x + d.x * s, at.y + d.y * s);
    ctx.lineTo(at.x - d.x * s - n.x * s, at.y - d.y * s - n.y * s);
    ctx.strokeStyle = tone.light;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  private clampShape(rod: Rod): void {
    const ctx = this.ctx;
    const a = Math.atan2(rod.direction.y, rod.direction.x);
    ctx.save();
    ctx.translate(rod.clamp.x, rod.clamp.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.roundRect(-CLAMP_LENGTH / 2, -CLAMP_WIDTH / 2, CLAMP_LENGTH, CLAMP_WIDTH, 4);
    ctx.restore();
  }

  /** The metal clamp: brushed steel with a bolt on each side. */
  private clampPiece(rod: Rod): void {
    const ctx = this.ctx;
    const a = Math.atan2(rod.direction.y, rod.direction.x);
    ctx.save();
    ctx.translate(rod.clamp.x, rod.clamp.y);
    ctx.rotate(a);
    const steel = ctx.createLinearGradient(0, -CLAMP_WIDTH / 2, 0, CLAMP_WIDTH / 2);
    steel.addColorStop(0, '#f4f6fb');
    steel.addColorStop(0.45, '#b9c0cf');
    steel.addColorStop(0.55, '#8e97aa');
    steel.addColorStop(1, '#d6dbe6');
    ctx.beginPath();
    ctx.roundRect(-CLAMP_LENGTH / 2 + 3, -CLAMP_WIDTH / 2, CLAMP_LENGTH - 6, CLAMP_WIDTH, 3);
    ctx.fillStyle = steel;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#4b5266';
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-CLAMP_LENGTH / 2, -TUBE / 2 - 3, CLAMP_LENGTH, TUBE + 6, 3);
    ctx.fillStyle = steel;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5b6377';
    for (const y of [-CLAMP_WIDTH / 2 + 3.5, CLAMP_WIDTH / 2 - 3.5]) {
      ctx.beginPath();
      ctx.arc(0, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private clipOffset(clip: Clip, fx: RingOutEffects): number {
    return fx.shakeOffset(pieceKey({ kind: 'ring', id: clip.from }));
  }

  private clipShadow(clip: Clip, board: Board, fx: RingOutEffects): void {
    const ctx = this.ctx;
    const d = this.screenToBoard({ x: this.clipOffset(clip, fx), y: 0 });
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.beginPath();
    ctx.moveTo(clip.weld.x, clip.weld.y);
    ctx.lineTo(clip.sleeve.x, clip.sleeve.y);
    ctx.strokeStyle = SHADOW_COLOR;
    ctx.lineWidth = ARM;
    ctx.stroke();
    this.sleeveShape(clip);
    ctx.fillStyle = SHADOW_COLOR;
    ctx.fill();
    ctx.restore();
  }

  private sleeveShape(clip: Clip): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(clip.sleeve.x, clip.sleeve.y);
    ctx.rotate(clip.at + Math.PI / 2);
    ctx.beginPath();
    ctx.roundRect(-CLIP_LENGTH / 2, -CLIP_WIDTH / 2, CLIP_LENGTH, CLIP_WIDTH, 5);
    ctx.restore();
  }

  /** The arm, from the ring that holds it, and the sleeve around the other tube. */
  private clipPiece(clip: Clip, board: Board, fx: RingOutEffects): void {
    const ctx = this.ctx;
    const tone = TONES[board.rings[clip.from].color];
    const d = this.screenToBoard({ x: this.clipOffset(clip, fx), y: 0 });
    ctx.save();
    ctx.translate(d.x, d.y);
    this.tube(
      () => {
        ctx.beginPath();
        ctx.moveTo(clip.weld.x, clip.weld.y);
        ctx.lineTo(clip.sleeve.x, clip.sleeve.y);
      },
      tone,
      ARM
    );

    ctx.save();
    ctx.translate(clip.sleeve.x, clip.sleeve.y);
    ctx.rotate(clip.at + Math.PI / 2);
    const body = ctx.createLinearGradient(0, -CLIP_WIDTH / 2, 0, CLIP_WIDTH / 2);
    body.addColorStop(0, tone.light);
    body.addColorStop(0.35, tone.base);
    body.addColorStop(1, tone.dark);
    ctx.beginPath();
    ctx.roundRect(-CLIP_LENGTH / 2, -CLIP_WIDTH / 2, CLIP_LENGTH, CLIP_WIDTH, 5);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = tone.dark;
    ctx.stroke();
    // Two grooves across, where it wraps the tube.
    ctx.strokeStyle = tone.dark;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.2;
    for (const x of [-CLIP_LENGTH / 4, CLIP_LENGTH / 4]) {
      ctx.beginPath();
      ctx.moveTo(x, -CLIP_WIDTH / 2 + 2);
      ctx.lineTo(x, CLIP_WIDTH / 2 - 2);
      ctx.stroke();
    }
    const flash = fx.flashOf(clip.id);
    if (flash > 0) {
      ctx.globalAlpha = flash;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-CLIP_LENGTH / 2, -CLIP_WIDTH / 2, CLIP_LENGTH, CLIP_WIDTH, 5);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }

  private glow(board: Board, piece: Piece, color: string, fx: RingOutEffects): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14 * this.ratio;
    ctx.strokeStyle = color;
    ctx.lineWidth = TUBE + 5;
    if (piece.kind === 'ring') {
      const ring = board.rings[piece.id];
      if (ring?.alive) {
        this.withShake(fx, ring, () => {
          this.ringPath(ring);
          ctx.stroke();
        });
      }
    } else {
      const rod = board.rods[piece.id];
      if (rod?.alive) {
        this.rodPath(this.shakenRodPoints(board, rod, fx));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private withShake(fx: RingOutEffects, ring: Ring, draw: () => void): void {
    const dx = fx.shakeOffset(pieceKey({ kind: 'ring', id: ring.id }));
    if (dx === 0) {
      draw();
      return;
    }
    const d = this.screenToBoard({ x: dx, y: 0 });
    this.ctx.save();
    this.ctx.translate(d.x, d.y);
    draw();
    this.ctx.restore();
  }

  // ---- Effects ------------------------------------------------------

  private drawShards(fx: RingOutEffects): void {
    const ctx = this.ctx;
    for (const s of fx.shards) {
      const fade = Math.min(1, (s.life - s.age) / (s.life * 0.4));
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.turn);
      const pts = s.corners.map(([a, r]) => polar({ x: 0, y: 0 }, r * s.size, a));
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = s.tone.base;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = s.tone.dark;
      ctx.stroke();
      // A lit facet and a shaded one: the shard reads as a little gem.
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.closePath();
      ctx.fillStyle = s.tone.light;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.closePath();
      ctx.fillStyle = s.tone.dark;
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPopups(fx: RingOutEffects): void {
    const ctx = this.ctx;
    ctx.save();
    // Words are read upright, whichever way the board is drawn.
    const k = this.unitPx * this.ratio;
    ctx.setTransform(k, 0, 0, k, this.originX * this.ratio, this.originY * this.ratio);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '400 19px Audiowide, system-ui, sans-serif';
    for (const p of fx.popups) {
      const t = p.age / p.life;
      const at = this.turned ? { x: -p.y, y: p.x } : { x: p.x, y: p.y };
      const y = at.y - 34 * t;
      const grow = t < 0.15 ? 0.6 + (t / 0.15) * 0.4 : 1;
      ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      ctx.save();
      ctx.translate(at.x, y);
      ctx.scale(grow, grow);
      ctx.fillStyle = '#ff2e88';
      ctx.fillText(p.text, 2, 2);
      ctx.fillStyle = '#5ee6ff';
      ctx.fillText(p.text, -1, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
}
