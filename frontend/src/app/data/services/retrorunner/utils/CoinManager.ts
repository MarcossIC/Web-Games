import { RetroRunnerKey, RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { PhaserSound } from '@app/data/services/phaser/types';
import { GameObjects, Physics, Scene } from 'phaser';
import ScoreManager from './ScoreManager';

const BASE_COIN_POINTS = 50;
const COIN_SCALE = 0.7;
const COMBO_TIMEOUT_MS = 1500;
const MAX_COMBO = 5;

/**
 * The coins: a pool that puts each one where the world's plan says, and
 * the score and sparks of picking them up. A picked-up coin goes back to
 * the pool only when its chunk is released: until then its chunk still
 * counts it as its own.
 */
class CoinManager {
  private scene: Scene;
  private coins: Physics.Arcade.Group;
  private free: Physics.Arcade.Sprite[] = [];
  private coinSound: PhaserSound;
  private scoreManager: ScoreManager;
  private comboCount: number = 0;
  private lastCoinTime: number = 0;
  /** The burst of sparks a coin leaves where it was picked up. */
  private sparks: GameObjects.Particles.ParticleEmitter;

  constructor(scene: Scene, scoreManager: ScoreManager) {
    this.scene = scene;
    this.scoreManager = scoreManager;
    this.coins = scene.physics.add.group({
      allowGravity: false,
    });
    this.coinSound = scene.sound.add(RetroRunnerMedia.COIN_SOUND, { volume: 0.15 });

    if (!scene.textures.exists('sparkPixel')) {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0xffe14a);
      gfx.fillRect(0, 0, 2, 2);
      gfx.generateTexture('sparkPixel', 2, 2);
      gfx.destroy();
    }
    // Without it a coin just vanishes: the sparks are what says "taken".
    this.sparks = scene.add.particles(0, 0, 'sparkPixel', {
      speed: { min: 40, max: 95 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      lifespan: { min: 220, max: 380 },
      gravityY: 160,
      emitting: false,
    });
    this.sparks.setDepth(6);
  }

  spawn(x: number, y: number): Physics.Arcade.Sprite {
    let coin = this.free.pop();
    if (coin) {
      coin.setPosition(x, y);
      coin.setActive(true).setVisible(true);
      (coin.body as Physics.Arcade.Body).enable = true;
    } else {
      coin = this.coins.create(x, y, RetroRunnerMedia.COIN_SPRITE) as Physics.Arcade.Sprite;
    }
    (coin.body as Physics.Arcade.Body).setAllowGravity(false);

    coin.setOrigin(0.5, 0.5).setScale(COIN_SCALE).setDepth(5);
    coin.anims.play(RetroRunnerKey.COIN_ANIM);
    return coin;
  }

  /** Back to the pool, picked up or not. */
  release(coin: Physics.Arcade.Sprite) {
    this.hide(coin);
    this.free.push(coin);
  }

  collectCoin(_player: Physics.Arcade.Sprite, coin: Physics.Arcade.Sprite) {
    if (!coin.active) return;
    const coinX = coin.x;
    const coinY = coin.y;
    this.hide(coin);

    // Combo system
    const now = this.scene.time.now;
    if (now - this.lastCoinTime < COMBO_TIMEOUT_MS) {
      this.comboCount = Math.min(this.comboCount + 1, MAX_COMBO);
    } else {
      this.comboCount = 1;
    }
    this.lastCoinTime = now;

    const multiplier = this.comboCount;
    const points = BASE_COIN_POINTS * multiplier;

    this.coinSound.play();
    this.sparks.emitParticleAt(coinX, coinY, 7);
    this.scoreManager.addCoinBonus(points);

    const comboText = multiplier > 1 ? `+${points} x${multiplier}` : `+${points}`;
    const comboColor = multiplier >= 4 ? '#ff4444' : multiplier >= 2 ? '#ff9900' : '#ffd700';
    this.scoreManager.showFloatingText(coinX, coinY, comboText, comboColor);
  }

  private hide(coin: Physics.Arcade.Sprite) {
    coin.anims.stop();
    coin.setActive(false).setVisible(false);
    (coin.body as Physics.Arcade.Body).enable = false;
  }

  getGroup(): Physics.Arcade.Group {
    return this.coins;
  }
}

export default CoinManager;
