import { GameObjects, Scene } from 'phaser';
import { BEST_SCORE_KEY, formatRunTime, RunScore, RunSummary, SCORING } from './run-score';

/**
 * The pixel typeface of the site. It is drawn at 16px, its native grid,
 * so it stays sharp when the 550x330 picture is enlarged.
 */
const HUD_FONT = 'Silkscreen, monospace';
/** Shown after the score while the rhythm makes the distance worth more. */
const RHYTHM_MARK = `  x${1 + SCORING.RHYTHM_BONUS}`;

/** The score of the run on screen; how it is counted lives in RunScore. */
class ScoreManager {
  private scene: Scene;
  private run: RunScore;
  private scoreText?: GameObjects.Text;
  private highScoreText?: GameObjects.Text;
  private clockText?: GameObjects.Text;
  /** What the score line shows now, so it is redrawn only when it changes. */
  private shownScore = -1;
  private shownRhythm = false;
  private shownSecond = -1;

  constructor(scene: Scene, startX: number) {
    this.scene = scene;
    this.run = new RunScore(startX);
  }

  createHUD() {
    this.scoreText = this.scene.add
      .text(10, 8, 'Score: 0', {
        fontSize: '16px',
        color: '#fff',
        stroke: '#07060d',
        strokeThickness: 3,
        fontFamily: HUD_FONT,
      })
      .setScrollFactor(0)
      .setDepth(100);

    // How long the run has lasted; a pause stops it.
    this.clockText = this.scene.add
      .text(this.scene.scale.width / 2, 8, formatRunTime(0), {
        fontSize: '16px',
        color: '#fff',
        stroke: '#07060d',
        strokeThickness: 3,
        fontFamily: HUD_FONT,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);

    const best = parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10);
    this.highScoreText = this.scene.add
      .text(this.scene.scale.width - 10, 8, `Best: ${best}`, {
        fontSize: '16px',
        color: '#ffe14a',
        stroke: '#07060d',
        strokeThickness: 3,
        fontFamily: HUD_FONT,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
  }

  /**
   * Called every frame with where the player is.
   * @param topSpeed - the running speed at that point of the world
   */
  update(playerX: number, deltaMs: number, topSpeed: number) {
    this.run.advance(playerX, deltaMs, topSpeed);

    const score = this.run.score;
    const rhythm = this.run.inRhythm;
    if (this.scoreText && (score !== this.shownScore || rhythm !== this.shownRhythm)) {
      this.shownScore = score;
      this.shownRhythm = rhythm;
      this.scoreText.setText(rhythm ? `Score: ${score}${RHYTHM_MARK}` : `Score: ${score}`);
    }

    const second = Math.floor(this.run.timeMs / 1000);
    if (this.clockText && second !== this.shownSecond) {
      this.shownSecond = second;
      this.clockText.setText(formatRunTime(this.run.timeMs));
    }
  }

  /** Scores a coin picked up at `now` and says what it was worth. */
  collectCoin(now: number): { combo: number; points: number } {
    return this.run.collectCoin(now);
  }

  showFloatingText(x: number, y: number, text: string, color: string = '#ffd700') {
    const floatingText = this.scene.add
      .text(x, y, text, {
        fontSize: '16px',
        color,
        stroke: '#07060d',
        strokeThickness: 3,
        fontFamily: HUD_FONT,
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
    return this.run.score;
  }

  getSummary(): RunSummary {
    return this.run.summary();
  }

  destroy() {
    this.scoreText?.destroy();
    this.highScoreText?.destroy();
    this.clockText?.destroy();
  }
}

export default ScoreManager;
