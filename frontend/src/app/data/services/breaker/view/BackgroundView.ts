import * as Phaser from 'phaser';
import { BreakerTexture } from '@app/data/models/breaker/BreakerKeys';
import { DEPTH } from './scene-kit';
import { Starfield } from './starfield';

const STARS = 40;
const NOVA_TINT = 0xffc2e6;

/**
 * The static space picture and ~40 pooled star sprites drifting down in
 * three depths (SCENE.md: not a full-screen TileSprite). The stars also
 * slide a touch against the paddle, a cheap second parallax axis.
 */
export class BackgroundView {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private readonly field: Starfield;
  private novaOn = false;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, seed: number, height: number = scene.scale.height) {
    const width = scene.scale.width;
    this.bg = scene.add.image(0, 0, BreakerTexture.BG_SPACE).setOrigin(0, 0).setDisplaySize(width, height).setDepth(DEPTH.BG);
    layer.add(this.bg);
    this.field = new Starfield(STARS, width, height, seed);
    for (let i = 0; i < STARS; i++) {
      const depth = this.field.depth[i];
      const size = 2 + depth * 5;
      const star = scene.add
        .image(0, 0, BreakerTexture.SPARK)
        .setDisplaySize(size, size)
        .setAlpha(0.18 + depth * 0.5)
        .setTint(depth > 0.7 ? 0xbfefff : 0xd8d0ff)
        .setDepth(DEPTH.STARS);
      layer.add(star);
      this.stars.push(star);
    }
  }

  sync(dtMs: number, timeScale: number, paddleX: number): void {
    const field = this.field;
    field.update(dtMs, timeScale);
    const sway = (paddleX - 480) * 0.03;
    for (let i = 0; i < this.stars.length; i++) {
      this.stars[i].setPosition(field.x[i] - sway * field.depth[i], field.y[i]);
    }
  }

  setNova(on: boolean): void {
    if (on === this.novaOn) return;
    this.novaOn = on;
    if (on) this.bg.setTint(NOVA_TINT);
    else this.bg.clearTint();
  }
}
