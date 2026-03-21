import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import SeededRandom from '@app/data/services/retrorunner/utils/SeededRandom';
import { Physics, Scene } from 'phaser';

const COLLAPSE_DELAY_MS = 450;  // time standing before shaking starts
const SHAKE_DURATION_MS = 300;  // shake before falling
const RECYCLE_DISTANCE = 600;

interface CollapsingBlock {
  sprite: Physics.Arcade.Sprite;
  state: 'idle' | 'waiting' | 'shaking' | 'falling';
  contactTime: number;
  originalY: number;
}

class CollapsingPlatformManager {
  private scene: Scene;
  private rng: SeededRandom;
  private blocks: CollapsingBlock[] = [];
  public group: Physics.Arcade.StaticGroup;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Scene, rng: SeededRandom) {
    this.scene = scene;
    this.rng = rng;
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
   * Spawn collapsing platforms on a segment.
   * Placed at ground surface level so they look like normal floor blocks.
   */
  trySpawn(segmentStartX: number, segmentEndX: number, floorY: number, chance: number) {
    if (!this.rng.chance(chance)) return;
    if (segmentEndX - segmentStartX < 200) return;

    const surfaceY = floorY - 17;
    const count = 1 + this.rng.integer(true, 1);
    const segW = segmentEndX - segmentStartX;

    for (let i = 0; i < count; i++) {
      const x = segmentStartX + this.rng.integer(false, Math.floor(segW * 0.6)) + 50 + i * 80;
      if (x >= segmentEndX - 40) break;

      // Place at surface level — looks like part of the floor
      const block = this.group.create(x, surfaceY + 16, RetroRunnerMedia.GRASS_BLOCK) as Physics.Arcade.Sprite;
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
        originalY: surfaceY + 16,
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
  updateBlocks(now: number, cameraScrollX: number) {
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

    // Clean up blocks far behind camera
    this.blocks = this.blocks.filter((block) => {
      if (!block.sprite.active && block.sprite.x < cameraScrollX - RECYCLE_DISTANCE) {
        block.sprite.destroy();
        return false;
      }
      return true;
    });
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
