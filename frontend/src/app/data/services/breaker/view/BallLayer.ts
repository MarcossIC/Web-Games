import * as Phaser from 'phaser';
import { BallArt, BreakerTexture } from '@app/data/models/breaker/BreakerKeys';
import { BALL } from '../engine/config';
import type { BreakerState } from '../engine/types';
import { BALL_TEXTURES, type BallLook, TRAIL_TINTS } from './looks';
import { DEPTH } from './scene-kit';
import { buildStreak, STREAK_STRIDE, streakFade } from './streak';
import { TrailRing } from './trail-ring';
import { lerp } from './view-math';

type Image = Phaser.GameObjects.Image;

/** Samples kept per ball: with the spacing below, a streak about 9 radii long. */
const TRAIL_LENGTH = 13;
/** A trail sample every 0.75 radius of travel, so the streak is as long at 60 Hz as at 144 Hz. */
const TRAIL_SPACING_R = 0.75;
/** A jump of more than this many radii between frames (a serve, a split) starts the streak over. */
const TRAIL_JUMP_R = 7.5;
/** The glow around the streak: half width (in radii) and opacity at the ball. */
const GLOW_HALF_R = 0.95;
const GLOW_ALPHA = 0.42;
/** The bright core inside it. */
const CORE_HALF_R = 0.42;
const CORE_ALPHA = 0.55;
const CORE_COLOR = 0xffffff;

interface BallSlot {
  /** Engine ball id, -1 when free. */
  id: number;
  seen: boolean;
  ball: Image;
  ring: TrailRing;
  look: BallLook | -1;
}

/**
 * Balls and their trails. Engine balls are compacted in place, so each one
 * is matched to its slot by id (a scan of 12 slots: no map, no allocation),
 * which keeps every trail on its own ball when others are lost or split off.
 */
export class BallLayer {
  private readonly slots: BallSlot[] = [];
  /** Art size: the texture is painted for a CORE_RADIUS ball, scaled to the engine's radius. */
  private readonly size: number;
  private readonly radius: number;
  private readonly spacing: number;
  /** Every ball's streak, redrawn each frame: one draw call for all of them. */
  private readonly streaks: Phaser.GameObjects.Graphics;
  /** Outline scratch of one streak (see buildStreak). */
  private readonly edges = new Float32Array((TRAIL_LENGTH + 1) * STREAK_STRIDE);
  private tint: number = TRAIL_TINTS[0];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, radius: number = BallArt.CORE_RADIUS) {
    const k = radius / BallArt.CORE_RADIUS;
    this.size = BallArt.SIZE * k;
    this.radius = radius;
    this.spacing = TRAIL_SPACING_R * radius;
    this.streaks = scene.add.graphics().setDepth(DEPTH.TRAILS).setBlendMode(Phaser.BlendModes.ADD);
    layer.add(this.streaks);
    for (let i = 0; i < BALL.CAP; i++) {
      const ball = scene.add
        .image(0, 0, BreakerTexture.BALL)
        .setDisplaySize(this.size, this.size)
        .setDepth(DEPTH.BALLS)
        .setVisible(false);
      layer.add(ball);
      this.slots.push({ id: -1, seen: false, ball, ring: new TrailRing(TRAIL_LENGTH, TRAIL_JUMP_R * radius), look: -1 });
    }
  }

  sync(state: BreakerState, look: BallLook): void {
    const slots = this.slots;
    for (let i = 0; i < slots.length; i++) slots[i].seen = false;

    this.streaks.clear();
    this.tint = TRAIL_TINTS[look];
    const alpha = state.alpha;
    const balls = state.balls;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (!b.alive) continue;
      const slot = this.slotFor(b.id);
      if (!slot) continue;
      slot.seen = true;
      const x = lerp(b.prevX, b.x, alpha);
      const y = lerp(b.prevY, b.y, alpha);
      slot.ball.setPosition(x, y);
      if (slot.look !== look) {
        slot.look = look;
        slot.ball.setTexture(BALL_TEXTURES[look]).setDisplaySize(this.size, this.size);
      }
      this.drawTrail(slot, x, y, b.stuck);
    }

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot.id !== -1 && !slot.seen) this.free(slot);
    }
  }

  private drawTrail(slot: BallSlot, x: number, y: number, stuck: boolean): void {
    const ring = slot.ring;
    if (stuck) {
      ring.clear();
      return;
    }
    if (ring.count === 0) {
      ring.push(x, y);
    } else {
      const dx = x - ring.xAt(0);
      const dy = y - ring.yAt(0);
      if (dx * dx + dy * dy >= this.spacing * this.spacing) ring.push(x, y);
    }
    this.fillStreak(ring, x, y, GLOW_HALF_R * this.radius, this.tint, GLOW_ALPHA);
    this.fillStreak(ring, x, y, CORE_HALF_R * this.radius, CORE_COLOR, CORE_ALPHA);
  }

  /** One band of the streak, a quad per segment, fading from the ball to the tail. */
  private fillStreak(ring: TrailRing, x: number, y: number, halfWidth: number, color: number, alpha: number): void {
    const e = this.edges;
    const n = buildStreak(ring, x, y, halfWidth, e);
    const g = this.streaks;
    for (let k = 0; k < n - 1; k++) {
      const a = k * STREAK_STRIDE;
      const b = a + STREAK_STRIDE;
      g.fillStyle(color, alpha * streakFade((k + 0.5) / (n - 1)));
      g.beginPath();
      g.moveTo(e[a], e[a + 1]);
      g.lineTo(e[b], e[b + 1]);
      g.lineTo(e[b + 2], e[b + 3]);
      g.lineTo(e[a + 2], e[a + 3]);
      g.closePath();
      g.fillPath();
    }
  }

  private slotFor(id: number): BallSlot | null {
    let free: BallSlot | null = null;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.id === id) return slot;
      if (slot.id === -1 && !free) free = slot;
    }
    if (!free) return null;
    free.id = id;
    free.ring.clear();
    free.look = -1;
    free.ball.setVisible(true);
    return free;
  }

  private free(slot: BallSlot): void {
    slot.id = -1;
    slot.ring.clear();
    slot.ball.setVisible(false);
  }
}
