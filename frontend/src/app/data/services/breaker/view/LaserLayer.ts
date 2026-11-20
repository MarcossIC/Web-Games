import * as Phaser from 'phaser';
import { BreakerTexture, LaserArt } from '@app/data/models/breaker/BreakerKeys';
import type { BreakerState } from '../engine/types';
import { DEPTH } from './scene-kit';
import { lerp } from './view-math';

/** Enough for the bolts in the air at the fastest cadence (two every 220 ms, ~0.7 s to the ceiling). */
const SLOTS = 24;

/** Laser bolts, matched to the engine's by index (they have no trail to keep). */
export class LaserLayer {
  private readonly bolts: Phaser.GameObjects.Image[] = [];
  private shown = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (let i = 0; i < SLOTS; i++) {
      const bolt = scene.add
        .image(0, 0, BreakerTexture.LASER_BOLT)
        .setDisplaySize(LaserArt.WIDTH, LaserArt.HEIGHT)
        .setDepth(DEPTH.LASERS)
        .setVisible(false);
      layer.add(bolt);
      this.bolts.push(bolt);
    }
  }

  sync(state: BreakerState): void {
    const lasers = state.lasers;
    let n = 0;
    for (let i = 0; i < lasers.length && n < SLOTS; i++) {
      const l = lasers[i];
      if (!l.alive) continue;
      this.bolts[n++].setVisible(true).setPosition(l.x, lerp(l.prevY, l.y, state.alpha));
    }
    for (let i = n; i < this.shown; i++) this.bolts[i].setVisible(false);
    this.shown = n;
  }
}
