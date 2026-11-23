import * as Phaser from 'phaser';
import { BreakerTexture } from '@app/data/models/breaker/BreakerKeys';
import { traceAim } from '../engine/aim';
import type { WorldLayout } from '../engine/config';
import type { BreakerState } from '../engine/types';
import { type BallLook, TRAIL_TINTS } from './looks';
import { DEPTH } from './scene-kit';
import { lerp } from './view-math';

type Image = Phaser.GameObjects.Image;

/** Guides drawn at once: a serve has one ball, a magnet rarely holds more. */
const MAX_GUIDES = 3;
/** The guide reaches this share of the way from the paddle up to the first brick row. */
const REACH_SHARE = 0.62;
/** Dot size and gap between dots, in ball radii. */
const DOT_SIZE_R = 1.3;
const DOT_GAP_R = 2.4;
/** The first dot sits this many radii from the ball's center, clear of its halo. */
const START_R = 2;
/** How fast the dots march away from the ball, in px/s. */
const MARCH_SPEED = 46;
const ALPHA_NEAR = 0.95;
const ALPHA_FAR = 0.15;

/**
 * The aim guide: while a ball waits on the paddle, a line of dots shows
 * where it will go when launched, bouncing off the walls and stopping at the
 * first brick it would hit. It turns as the paddle moves (the engine's
 * `aimRad`) and is gone the moment the ball flies.
 */
export class AimGuide {
  private readonly dots: Image[] = [];
  private readonly path: number[] = [];
  private readonly r: number;
  private readonly length: number;
  private readonly gap: number;
  private readonly size: number;
  private shown = 0;
  private march = 0;
  private look: BallLook | -1 = -1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, layout: WorldLayout) {
    this.r = layout.ballR;
    this.length = REACH_SHARE * (layout.paddleY - layout.gridTop);
    this.gap = DOT_GAP_R * this.r;
    this.size = DOT_SIZE_R * this.r;
    const perGuide = Math.ceil(this.length / this.gap) + 1;
    for (let i = 0; i < MAX_GUIDES * perGuide; i++) {
      const dot = scene.add
        .image(0, 0, BreakerTexture.TRAIL)
        .setDisplaySize(this.size, this.size)
        .setDepth(DEPTH.TRAILS)
        .setVisible(false);
      layer.add(dot);
      this.dots.push(dot);
    }
  }

  sync(state: BreakerState, look: BallLook, dtMs: number): void {
    if (look !== this.look) {
      this.look = look;
      for (const dot of this.dots) dot.setTint(TRAIL_TINTS[look]);
    }
    this.march = (this.march + (MARCH_SPEED * Math.max(0, dtMs)) / 1000) % this.gap;

    let n = 0;
    let guides = 0;
    const aiming = state.phase === 'serve' || state.phase === 'playing';
    const balls = state.balls;
    for (let i = 0; aiming && i < balls.length && guides < MAX_GUIDES; i++) {
      const b = balls[i];
      if (!b.alive || !b.stuck) continue;
      guides++;
      const x = lerp(b.prevX, b.x, state.alpha);
      const y = lerp(b.prevY, b.y, state.alpha);
      const points = traceAim(this.path, x, y, b.aimRad, b.r, this.length, state);
      n = this.place(n, points);
    }

    for (let i = n; i < this.shown; i++) this.dots[i].setVisible(false);
    this.shown = n;
  }

  /** Lays dots along the traced polyline from dot `n` on; returns the next free dot. */
  private place(n: number, count: number): number {
    const path = this.path;
    const dots = this.dots;
    let travelled = 0;
    let next = START_R * this.r + this.march;
    for (let s = 0; s + 1 < count && n < dots.length; s++) {
      const x0 = path[s * 2];
      const y0 = path[s * 2 + 1];
      const sx = path[s * 2 + 2] - x0;
      const sy = path[s * 2 + 3] - y0;
      const len = Math.hypot(sx, sy);
      while (next <= travelled + len && next <= this.length && n < dots.length) {
        const k = len > 0 ? (next - travelled) / len : 0;
        const far = next / this.length;
        // Fade in over the first gap so the march does not pop dots in at the ball.
        const fadeIn = Math.min(1, (next - START_R * this.r) / this.gap);
        dots[n++]
          .setVisible(true)
          .setPosition(x0 + sx * k, y0 + sy * k)
          .setAlpha(lerp(ALPHA_NEAR, ALPHA_FAR, far) * fadeIn);
        next += this.gap;
      }
      travelled += len;
    }
    return n;
  }
}
