import * as Phaser from 'phaser';
import { BallArt, BreakerTexture } from '@app/data/models/breaker/BreakerKeys';
import { BALL } from '../engine/config';
import type { BreakerState } from '../engine/types';
import { BALL_TEXTURES, type BallLook, TRAIL_TINTS } from './looks';
import { DEPTH } from './scene-kit';
import { TrailRing } from './trail-ring';
import { lerp } from './view-math';

type Image = Phaser.GameObjects.Image;

const TRAIL_LENGTH = 8;
/** A trail sample every few px of travel, so the trail is as long at 60 Hz as at 144 Hz. */
const TRAIL_SPACING = 5;

interface BallSlot {
  /** Engine ball id, -1 when free. */
  id: number;
  seen: boolean;
  ball: Image;
  trail: Image[];
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

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (let i = 0; i < BALL.CAP; i++) {
      const trail: Image[] = [];
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const dot = scene.add.image(0, 0, BreakerTexture.TRAIL).setDepth(DEPTH.TRAILS).setVisible(false);
        layer.add(dot);
        trail.push(dot);
      }
      const ball = scene.add
        .image(0, 0, BreakerTexture.BALL)
        .setDisplaySize(BallArt.SIZE, BallArt.SIZE)
        .setDepth(DEPTH.BALLS)
        .setVisible(false);
      layer.add(ball);
      this.slots.push({ id: -1, seen: false, ball, trail, ring: new TrailRing(TRAIL_LENGTH, 60), look: -1 });
    }
  }

  sync(state: BreakerState, look: BallLook): void {
    const slots = this.slots;
    for (let i = 0; i < slots.length; i++) slots[i].seen = false;

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
        slot.ball.setTexture(BALL_TEXTURES[look]).setDisplaySize(BallArt.SIZE, BallArt.SIZE);
        for (const dot of slot.trail) dot.setTint(TRAIL_TINTS[look]);
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
    } else if (ring.count === 0) {
      ring.push(x, y);
    } else {
      const dx = x - ring.xAt(0);
      const dy = y - ring.yAt(0);
      if (dx * dx + dy * dy >= TRAIL_SPACING * TRAIL_SPACING) ring.push(x, y);
    }
    const trail = slot.trail;
    for (let i = 0; i < trail.length; i++) {
      const dot = trail[i];
      if (i >= ring.count) {
        if (dot.visible) dot.setVisible(false);
        continue;
      }
      const k = 1 - i / TRAIL_LENGTH;
      const size = BallArt.TRAIL_SIZE * (0.45 + 0.75 * k);
      dot
        .setVisible(true)
        .setPosition(ring.xAt(i), ring.yAt(i))
        .setDisplaySize(size, size)
        .setAlpha(0.6 * k * k);
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
    for (const dot of slot.trail) dot.setVisible(false);
  }
}
