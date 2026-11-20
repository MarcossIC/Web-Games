import * as Phaser from 'phaser';
import { RetroRunnerFloor, RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { Physics, Scene } from 'phaser';

const COLLAPSE_DELAY_MS = 450;  // time standing before shaking starts
const SHAKE_DURATION_MS = 300;  // shake before falling
const BLOCK_WIDTH = RetroRunnerFloor.GRASS_BLOCK_WIDTH;
// A block's centre sits this far below the floor's surface (it is 32 px tall).
const BLOCK_CENTER_BELOW_SURFACE = 16;
// The floor's surface is this far above the centre of its tiles.
const SURFACE_ABOVE_FLOOR_Y = 17;
const BLOCK_TINT = 0xddaa77;
// Bridge blocks are drawn at the floor's depth.
const BLOCK_DEPTH = 0;
// An idle block breathes to telegraph that it is unstable: it shrinks to
// 95 % of its height and back, 600 ms each way.
const BREATH_DEPTH = 0.05;
const BREATH_HALF_PERIOD_MS = 600;

/**
 * How tall an idle block is drawn at `now`, as a share of its height. Every
 * block reads the same clock, so a bridge needs no tween to breathe; the
 * curve is the Sine.easeInOut yoyo each block used to tween on its own.
 */
export function breathingScale(now: number): number {
  return 1 - (BREATH_DEPTH * (1 - Math.cos((Math.PI * now) / BREATH_HALF_PERIOD_MS))) / 2;
}

interface CollapsingBlock {
  sprite: Physics.Arcade.Sprite;
  state: 'idle' | 'waiting' | 'shaking' | 'falling';
  contactTime: number;
}

/**
 * The bridges of collapsing blocks. Its blocks are reused: a released one
 * waits hidden, with no body, until the next bridge needs it.
 */
class CollapsingPlatformManager {
  private scene: Scene;
  /** The blocks in the world, in the order they were laid. */
  private blocks: CollapsingBlock[] = [];
  /** The same blocks, found by their sprite when the player lands on one. */
  private bySprite = new Map<Physics.Arcade.Sprite, CollapsingBlock>();
  private free: Physics.Arcade.Sprite[] = [];
  public group: Physics.Arcade.StaticGroup;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Scene) {
    this.scene = scene;
    this.group = scene.physics.add.staticGroup();

    // Debris particle emitter for collapse effect
    if (!scene.textures.exists('debrisPixel')) {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0x99774d);
      gfx.fillRect(0, 0, 3, 3);
      gfx.generateTexture('debrisPixel', 3, 3);
      gfx.destroy();
    }

    this.dustEmitter = scene.add.particles(0, 0, 'debrisPixel', {
      speed: { min: 20, max: 60 },
      angle: { min: 220, max: 320 },
      scale: { start: 1, end: 0 },
      lifespan: 400,
      alpha: { start: 0.8, end: 0 },
      gravityY: 120,
      emitting: false,
    });
    this.dustEmitter.setDepth(9);
  }

  /**
   * Lays a bridge of collapsing blocks across a hole in the floor, level
   * with both edges. Crossing without stopping is safe; standing on it drops
   * the player into the hole. Over solid floor a falling block would leave
   * the floor underneath, so a bridge is the only place they go.
   *
   * @param holeStartX - where the floor on the left ends
   * @param holeEndX - where the floor on the right starts
   * @param floorY - the centre of the floor tiles on both sides
   */
  spawnBridge(holeStartX: number, holeEndX: number, floorY: number): Physics.Arcade.Sprite[] {
    const span = holeEndX - holeStartX;
    const count = Math.max(1, Math.ceil(span / BLOCK_WIDTH));
    // The blocks overhang both edges by the same amount.
    const firstX = holeStartX - (count * BLOCK_WIDTH - span) / 2;
    const y = floorY - SURFACE_ABOVE_FLOOR_Y + BLOCK_CENTER_BELOW_SURFACE;
    const sprites: Physics.Arcade.Sprite[] = [];

    for (let i = 0; i < count; i++) {
      const sprite = this.takeBlock(firstX + i * BLOCK_WIDTH, y);
      const block: CollapsingBlock = { sprite, state: 'idle', contactTime: 0 };
      this.blocks.push(block);
      this.bySprite.set(sprite, block);
      sprites.push(sprite);
    }
    return sprites;
  }

  /**
   * Takes a bridge back, whether or not anyone stepped on it, and stops
   * whatever its blocks were doing: shaking, or falling.
   */
  release(sprites: readonly Physics.Arcade.Sprite[]) {
    for (const sprite of sprites) {
      this.scene.tweens.killTweensOf(sprite);
      sprite.setActive(false).setVisible(false);
      sprite.body!.enable = false;
      this.bySprite.delete(sprite);
      this.free.push(sprite);
    }
    let kept = 0;
    for (const block of this.blocks) {
      if (this.bySprite.has(block.sprite)) this.blocks[kept++] = block;
    }
    this.blocks.length = kept;
  }

  /**
   * Called when the Phaser collider detects player on a collapsing block.
   * Starts the collapse timer.
   */
  onPlayerCollide(player: Physics.Arcade.Sprite, sprite: Physics.Arcade.Sprite) {
    const block = this.bySprite.get(sprite);
    if (!block || block.state !== 'idle') return;

    // Only trigger if player is on TOP (not hitting from below/side)
    if (player.body!.bottom > sprite.body!.top + 8) return;

    block.state = 'waiting';
    block.contactTime = this.scene.time.now;
  }

  /**
   * Call every frame: makes the idle blocks breathe and moves the ones the
   * player stood on from waiting to shaking.
   */
  updateBlocks(now: number) {
    const breath = breathingScale(now);
    for (const block of this.blocks) {
      if (block.state === 'idle' || block.state === 'waiting') block.sprite.scaleY = breath;

      if (block.state === 'waiting' && now - block.contactTime >= COLLAPSE_DELAY_MS) {
        block.state = 'shaking';
        this.startShake(block);
      }
    }
  }

  /**
   * A block for a bridge, its left edge at `x` and its centre at `y`. A
   * reused one is put back as a new one would be, drawn over what was built
   * since its last use, and its body is refreshed: a static body copies its
   * size and place from its sprite only then.
   */
  private takeBlock(x: number, y: number): Physics.Arcade.Sprite {
    let sprite = this.free.pop();
    if (sprite) {
      sprite.setPosition(x, y).setScale(1).setAlpha(1).setActive(true).setVisible(true);
      sprite.setToTop().setDepth(BLOCK_DEPTH);
      sprite.body!.enable = true;
    } else {
      sprite = this.group.create(x, y, RetroRunnerMedia.GRASS_BLOCK) as Physics.Arcade.Sprite;
      sprite.setOrigin(0, 0.5).setTint(BLOCK_TINT).setDepth(BLOCK_DEPTH);
    }
    sprite.refreshBody();
    return sprite;
  }

  private startShake(block: CollapsingBlock) {
    block.sprite.setScale(1);

    // Rapid horizontal shake
    this.scene.tweens.add({
      targets: block.sprite,
      x: block.sprite.x + 2,
      duration: 35,
      yoyo: true,
      repeat: Math.floor(SHAKE_DURATION_MS / 70),
      onComplete: () => {
        this.collapseBlock(block);
      },
    });
  }

  private collapseBlock(block: CollapsingBlock) {
    block.state = 'falling';

    // Debris particles
    this.dustEmitter.emitParticleAt(
      block.sprite.x + 16,
      block.sprite.y,
      8
    );

    // Disable physics body so player falls through
    block.sprite.body!.enable = false;

    // Animate falling + fade out
    this.scene.tweens.add({
      targets: block.sprite,
      y: block.sprite.y + 100,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        block.sprite.setActive(false).setVisible(false);
      },
    });
  }

  getGroup(): Physics.Arcade.StaticGroup {
    return this.group;
  }
}

export default CollapsingPlatformManager;
