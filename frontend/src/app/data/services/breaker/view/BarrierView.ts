import * as Phaser from 'phaser';
import { BarrierArt, BreakerTexture, TEXTURE_SCALE } from '@app/data/models/breaker/BreakerKeys';
import { EFFECTS } from '../engine/config';
import type { BreakerState } from '../engine/types';
import { DEPTH } from './scene-kit';
import { clamp01, pulse } from './view-math';

const BURN_MS = 380;

/**
 * The barrier: a TileSprite whose pattern scrolls (shimmer) and breathes.
 * When it saves a ball it flares up, swells and fades, even though the
 * engine already took it away.
 */
export class BarrierView {
  private readonly strip: Phaser.GameObjects.TileSprite;
  private clockMs = 0;
  private burnMs = -1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.strip = scene.add
      .tileSprite(BarrierArt.WIDTH / 2, EFFECTS.BARRIER_Y, BarrierArt.WIDTH, BarrierArt.HEIGHT, BreakerTexture.BARRIER)
      .setTileScale(1 / TEXTURE_SCALE)
      .setDepth(DEPTH.BARRIER)
      .setVisible(false);
    layer.add(this.strip);
  }

  /** It saved a ball (event). */
  burn(): void {
    this.burnMs = 0;
  }

  sync(state: BreakerState, dtMs: number): void {
    this.clockMs += dtMs * state.timeScale;
    const strip = this.strip;
    if (this.burnMs >= 0) {
      this.burnMs += dtMs;
      const t = clamp01(this.burnMs / BURN_MS);
      strip.setVisible(true).setAlpha(1 - t).setScale(1, 1 + t * 1.6);
      if (t >= 1) {
        this.burnMs = -1;
        strip.setScale(1, 1);
      }
      return;
    }
    if (!state.barrier) {
      if (strip.visible) strip.setVisible(false);
      return;
    }
    strip.setVisible(true);
    strip.tilePositionX = (this.clockMs * 0.08) % (BarrierArt.PERIOD * TEXTURE_SCALE);
    strip.setAlpha(0.7 + 0.3 * pulse(this.clockMs, 1400));
  }
}
