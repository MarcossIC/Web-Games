import { RetroRunnerKey, RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { PhaserSound } from '@app/data/services/phaser/types';
import SeededRandom from '@app/data/services/retrorunner/utils/SeededRandom';
import { Physics, Scene } from 'phaser';
import ScoreManager from './ScoreManager';

const RECYCLE_DISTANCE = 600;
const BASE_COIN_POINTS = 50;
const COIN_SCALE = 0.7;
const COMBO_TIMEOUT_MS = 1500;
const MAX_COMBO = 5;

// Player physics for parabolic coin arc calculation
const PLAYER_VX = 190;
const PLAYER_JUMP_VY = 510;
const COIN_GRAVITY = 700;

class CoinManager {
  private scene: Scene;
  private rng: SeededRandom;
  private coins: Physics.Arcade.Group;
  private coinSound: PhaserSound;
  private scoreManager: ScoreManager;
  private comboCount: number = 0;
  private lastCoinTime: number = 0;

  constructor(scene: Scene, scoreManager: ScoreManager, rng: SeededRandom) {
    this.scene = scene;
    this.rng = rng;
    this.scoreManager = scoreManager;
    this.coins = scene.physics.add.group({
      allowGravity: false,
    });
    this.coinSound = scene.sound.add(RetroRunnerMedia.COIN_SOUND, { volume: 0.15 });
  }

  trySpawnCoins(
    segmentStartX: number,
    segmentEndX: number,
    floorY: number,
    coinChance: number
  ) {
    if (!this.rng.chance(coinChance)) return;

    const segmentWidth = segmentEndX - segmentStartX;
    if (segmentWidth < 100) return;

    const coinCount = 1 + this.rng.integer(true, 3);
    const spacing = 28;
    const startX = segmentStartX + this.rng.integer(false, Math.floor(segmentWidth * 0.3)) + 40;
    // Ground surface is 17px above floorY (tile center), coins float 40px above surface
    const surfaceY = floorY - 17;
    const coinY = surfaceY - 40;

    for (let i = 0; i < coinCount; i++) {
      const x = startX + i * spacing;
      if (x >= segmentEndX - 20) break;

      // Try to recycle a pooled coin first
      let coin = this.coins.getFirstDead(false) as Physics.Arcade.Sprite | null;

      if (coin) {
        coin.setPosition(x, coinY);
        coin.setActive(true).setVisible(true);
        (coin.body as Physics.Arcade.Body).enable = true;
        (coin.body as Physics.Arcade.Body).setAllowGravity(false);
      } else {
        coin = this.coins.create(x, coinY, RetroRunnerMedia.COIN_SPRITE) as Physics.Arcade.Sprite;
        (coin.body as Physics.Arcade.Body).setAllowGravity(false);
      }

      coin.setOrigin(0.5, 0.5).setScale(COIN_SCALE).setDepth(5);
      coin.anims.play(RetroRunnerKey.COIN_ANIM);
    }
  }

  /**
   * Place coins along the parabolic jump trajectory over a gap.
   * Acts as visual guide showing the player the correct jump arc.
   */
  spawnArcCoins(gapStartX: number, gapEndX: number, floorY: number) {
    const gapWidth = gapEndX - gapStartX;
    if (gapWidth < 60) return;

    // Ground surface is 17px above floorY (tile center)
    const surfaceY = floorY - 17;

    // Calculate jump arc: parabola starting from ground surface
    const totalTime = gapWidth / PLAYER_VX;
    const coinCount = Math.min(5, Math.max(3, Math.floor(gapWidth / 40)));

    for (let i = 0; i < coinCount; i++) {
      const t = (i + 0.5) / coinCount * totalTime;
      const x = gapStartX + PLAYER_VX * t;
      // Parabolic Y: start at surfaceY, arc upward then back down
      const arcHeight = PLAYER_JUMP_VY * t - 0.5 * COIN_GRAVITY * t * t;
      const y = surfaceY - arcHeight;

      // Clamp: never below surface, never too high
      const coinY = Math.max(surfaceY - 110, Math.min(surfaceY - 20, y));

      let coin = this.coins.getFirstDead(false) as Physics.Arcade.Sprite | null;

      if (coin) {
        coin.setPosition(x, coinY);
        coin.setActive(true).setVisible(true);
        (coin.body as Physics.Arcade.Body).enable = true;
        (coin.body as Physics.Arcade.Body).setAllowGravity(false);
      } else {
        coin = this.coins.create(x, coinY, RetroRunnerMedia.COIN_SPRITE) as Physics.Arcade.Sprite;
        (coin.body as Physics.Arcade.Body).setAllowGravity(false);
      }

      coin.setOrigin(0.5, 0.5).setScale(COIN_SCALE).setDepth(5);
      coin.anims.play(RetroRunnerKey.COIN_ANIM);
    }
  }

  collectCoin(_player: Physics.Arcade.Sprite, coin: Physics.Arcade.Sprite) {
    if (!coin.active) return;
    const coinX = coin.x;
    const coinY = coin.y;

    // Pool instead of destroy
    coin.setActive(false).setVisible(false);
    (coin.body as Physics.Arcade.Body).enable = false;

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
    this.scoreManager.addCoinBonus(points);

    const comboText = multiplier > 1 ? `+${points} x${multiplier}` : `+${points}`;
    const comboColor = multiplier >= 4 ? '#ff4444' : multiplier >= 2 ? '#ff9900' : '#ffd700';
    this.scoreManager.showFloatingText(coinX, coinY, comboText, comboColor);
  }

  update(cameraScrollX: number) {
    this.coins.children.each((child) => {
      const sprite = child as Physics.Arcade.Sprite;
      if (sprite.active && sprite.x < cameraScrollX - RECYCLE_DISTANCE) {
        // Pool instead of destroy
        sprite.setActive(false).setVisible(false);
        (sprite.body as Physics.Arcade.Body).enable = false;
      }
      return true;
    });
  }

  getGroup(): Physics.Arcade.Group {
    return this.coins;
  }
}

export default CoinManager;
