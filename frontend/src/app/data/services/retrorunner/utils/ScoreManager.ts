import { GameObjects, Scene } from 'phaser';

class ScoreManager {
  private scene: Scene;
  private score: number = 0;
  private scoreText!: GameObjects.Text;
  private highScoreText!: GameObjects.Text;
  private playerStartX: number;
  private coinBonus: number = 0;

  constructor(scene: Scene, startX: number) {
    this.scene = scene;
    this.playerStartX = startX;
  }

  createHUD() {
    this.scoreText = this.scene.add
      .text(10, 8, 'Score: 0', {
        fontSize: '12px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 2,
        fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setDepth(100);

    const highScore = parseInt(localStorage.getItem('retroRunnerHighScore') ?? '0', 10);
    this.highScoreText = this.scene.add
      .text(this.scene.scale.width - 10, 8, `Best: ${highScore}`, {
        fontSize: '10px',
        color: '#ffd700',
        stroke: '#000',
        strokeThickness: 2,
        fontFamily: 'monospace',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(playerX: number) {
    const distance = Math.max(0, Math.floor((playerX - this.playerStartX) / 10));
    this.score = distance + this.coinBonus;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  addCoinBonus(points: number) {
    this.coinBonus += points;
  }

  showFloatingText(x: number, y: number, text: string, color: string = '#ffd700') {
    const floatingText = this.scene.add
      .text(x, y, text, {
        fontSize: '10px',
        color,
        stroke: '#000',
        strokeThickness: 1,
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 1)
      .setDepth(100);

    this.scene.tweens.add({
      targets: floatingText,
      y: y - 30,
      alpha: 0,
      duration: 700,
      ease: 'Power2',
      onComplete: () => floatingText.destroy(),
    });
  }

  getScore(): number {
    return this.score;
  }

  destroy() {
    this.scoreText?.destroy();
    this.highScoreText?.destroy();
  }
}

export default ScoreManager;
