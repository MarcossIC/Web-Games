import { PhaserPlayerWithBody } from '@app/data/services/phaser/types';
import { snapToScroll } from '@app/data/services/retrorunner/utils/camera-smoothing';
import { GameObjects, Scene } from 'phaser';

/**
 * The capybara the player sees.
 *
 * The sprite that has the physics body stays hidden and this one is drawn
 * in its place, copying its frame and facing. Two things depend on that:
 * - squash and stretch scale this sprite only. On the body's sprite they
 *   also resize the hitbox, and with its corner origin they pushed the
 *   capybara sideways on every jump and landing.
 * - it is drawn on whole screen pixels, measured from the camera, so its
 *   pixels keep their shape while it moves.
 */
class PlayerView {
  private readonly sprite: GameObjects.Sprite;
  private readonly baseScale: number;

  constructor(
    private readonly scene: Scene,
    private readonly body: PhaserPlayerWithBody
  ) {
    this.baseScale = body.scaleX;
    this.sprite = scene.add
      .sprite(body.x, body.y, body.texture.key, body.frame.name)
      // Feet in the middle: squashing spreads to both sides evenly.
      .setOrigin(0.5, 1)
      .setScale(this.baseScale)
      .setDepth(body.depth);
    body.setVisible(false);
  }

  /** Places the capybara where its body is. Call once the camera is set. */
  sync(exactScroll: number, drawnScroll: number): void {
    const body = this.body;
    const centerX = body.x + (body.width * this.baseScale) / 2;
    this.sprite.setPosition(
      snapToScroll(centerX, exactScroll, drawnScroll),
      Math.round(body.y)
    );
    this.sprite.setFrame(body.frame.name);
    this.sprite.setFlipX(body.flipX);
  }

  /**
   * Deforms the capybara and lets it spring back.
   * `x` and `y` are relative to its normal size: 1.1 is 10% wider.
   */
  squash(x: number, y: number, duration: number, ease: string): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAlpha(1).setScale(this.baseScale * x, this.baseScale * y);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScale,
      scaleY: this.baseScale,
      duration,
      ease,
    });
  }

  /** Flickers a few times: the hit that ends the run. */
  blink(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(this.baseScale);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 1, to: 0.2 },
      duration: 80,
      yoyo: true,
      repeat: 3,
    });
  }
}

export default PlayerView;
