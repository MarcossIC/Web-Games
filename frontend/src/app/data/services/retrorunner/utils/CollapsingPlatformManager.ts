import * as Phaser from 'phaser';
import { RetroRunnerFloor, RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { Physics, Scene } from 'phaser';

const COLLAPSE_DELAY_MS = 450;  // time standing before shaking starts
const SHAKE_DURATION_MS = 300;  // shake before falling
const RECYCLE_DISTANCE = 600;
const BLOCK_WIDTH = RetroRunnerFloor.GRASS_BLOCK_WIDTH;
// A block's centre sits this far below the floor's surface (it is 32 px tall).
const BLOCK_CENTER_BELOW_SURFACE = 16;
// The floor's surface is this far above the centre of its tiles.
const SURFACE_ABOVE_FLOOR_Y = 17;

interface CollapsingBlock {
  sprite: Physics.Arcade.Sprite;
  state: 'idle' | 'waiting' | 'shaking' | 'falling';
  contactTime: number;
  originalY: number;
}

class CollapsingPlatformManager {
  private scene: Scene;
  private blocks: CollapsingBlock[] = [];
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
  spawnBridge(holeStartX: number, holeEndX: number, floorY: number) {
    const span = holeEndX - holeStartX;
    const count = Math.max(1, Math.ceil(span / BLOCK_WIDTH));
    // The blocks overhang both edges by the same amount.
    const firstX = holeStartX - (count * BLOCK_WIDTH - span) / 2;
    const y = floorY - SURFACE_ABOVE_FLOOR_Y + BLOCK_CENTER_BELOW_SURFACE;

    for (let i = 0; i < count; i++) {
      const block = this.group.create(firstX + i * BLOCK_WIDTH, y, RetroRunnerMedia.GRASS_BLOCK) as Physics.Arcade.Sprite;
      block.setOrigin(0, 0.5).refreshBody();
      block.setTint(0xddaa77);

      // Subtle "breathing" pulse to telegraph instability
      this.scene.tweens.add({
        targets: block,
        scaleY: 0.95,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.blocks.push({
        sprite: block,
        state: 'idle',
        contactTime: 0,
        originalY: y,
      });
    }
  }

  /**
   * Called when the Phaser collider detects player on a collapsing block.
   * Starts the collapse timer.
   */
  onPlayerCollide(player: Physics.Arcade.Sprite, block: Physics.Arcade.Sprite) {
    const entry = this.blocks.find(b => b.sprite === block);
    if (!entry || entry.state !== 'idle') return;

    // Only trigger if player is on TOP (not hitting from below/side)
    if (player.body!.bottom > block.body!.top + 8) return;

    entry.state = 'waiting';
    entry.contactTime = this.scene.time.now;
  }

  /**
   * Call every frame — handles delay → shake → collapse transitions.
   */
  updateBlocks(now: number) {
    for (const block of this.blocks) {
      if (!block.sprite.active) continue;

      if (block.state === 'waiting') {
        // Wait COLLAPSE_DELAY_MS before shaking
        if (now - block.contactTime >= COLLAPSE_DELAY_MS) {
          block.state = 'shaking';
          this.startShake(block);
        }
      }
    }
  }

  /**
   * Destroys the blocks left far behind the camera, whether or not anyone
   * stepped on them, with the tweens that animate them: an idle block's
   * breathing tween never ends on its own.
   */
  recycle(cameraScrollX: number) {
    const threshold = cameraScrollX - RECYCLE_DISTANCE;
    let kept = 0;
    for (const block of this.blocks) {
      if (block.sprite.x < threshold) {
        this.scene.tweens.killTweensOf(block.sprite);
        block.sprite.destroy();
      } else {
        this.blocks[kept++] = block;
      }
    }
    this.blocks.length = kept;
  }

  private startShake(block: CollapsingBlock) {
    // Kill the breathing tween
    this.scene.tweens.killTweensOf(block.sprite);
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
