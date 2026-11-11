import * as Phaser from 'phaser';
import {
  RetroRunnerMedia,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { PhaserSound } from '@app/data/services/phaser/types';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { BEST_SCORE_KEY, formatRunTime, RunSummary } from '@app/data/services/retrorunner/utils/run-score';
import { Scene } from 'phaser';

// The typefaces of the site. Silkscreen is a pixel face with a 8px grid:
// sizes that are multiples of 8 stay sharp when the picture is enlarged.
const TITLE_FONT = 'Audiowide, sans-serif';
const TEXT_FONT = 'Silkscreen, monospace';
/**
 * Space starts the next run only after the screen has been up this long:
 * a jump pressed while falling would otherwise skip the screen.
 */
const RETRY_ARMED_AFTER_MS = 600;

const EMPTY_RUN: RunSummary = {
  timeMs: 0,
  distance: 0,
  coins: 0,
  maxCombo: 0,
  coinPoints: 0,
  rhythmPoints: 0,
  points: 0,
  score: 0,
};

/**
 * The run in two lines: how long it lasted, the distance and the points
 * that make the score, then what the points came from.
 */
export function describeRun(run: RunSummary): string[] {
  const combo = run.maxCombo > 0 ? `x${run.maxCombo}` : '-';
  return [
    `Time ${formatRunTime(run.timeMs)}  |  Distance ${run.distance}  +  Points ${run.points}`,
    `Coins ${run.coins} (+${run.coinPoints})  |  Combo ${combo}  |  Rhythm +${Math.floor(run.rhythmPoints)}`,
  ];
}

/**
 * What a press of Space on this screen asks for: a new run, the same seed
 * again with Shift, or nothing for a Space still held from the last jump
 * (the key repeats) or pressed as the screen appears.
 */
export function retryChoice(
  key: { repeat: boolean; shiftKey: boolean },
  shownForMs: number
): 'new-seed' | 'same-seed' | null {
  if (key.repeat || shownForMs < RETRY_ARMED_AFTER_MS) return null;
  return key.shiftKey ? 'same-seed' : 'new-seed';
}

/** Keeps `score` if it beats the best one, and returns the best. */
export function recordBest(score: number, storage: Pick<Storage, 'getItem' | 'setItem'>): number {
  const best = parseInt(storage.getItem(BEST_SCORE_KEY) ?? '0', 10);
  if (score <= best) return best;
  storage.setItem(BEST_SCORE_KEY, String(score));
  return score;
}

class GameOverScene extends Scene {
  public gameOverSound!: PhaserSound;
  public capibaraSound!: PhaserSound;
  private run: RunSummary = EMPTY_RUN;
  private best: number = 0;
  private seedKey: string = '';
  /** A click and a Space together start one run, not two. */
  private leaving = false;
  /**
   * How long the screen has been up, from the frames it got. The scene's
   * clock is not up to date yet when create() runs.
   */
  private shownMs = 0;

  constructor() {
    super(SceneKeys.GAME_OVER);
  }

  init(data: { run?: RunSummary; seed?: string }) {
    this.leaving = false;
    this.shownMs = 0;
    this.run = data?.run ?? EMPTY_RUN;
    this.seedKey = data?.seed ?? '';

    this.gameOverSound = this.sound.add(RetroRunnerMedia.GAMEOVER_SOUND, {
      volume: 0.2,
    });
    this.capibaraSound = this.sound.add(RetroRunnerMedia.CAPIBARA_SOUND, {
      volume: 0.2,
    });

    this.best = recordBest(this.run.score, localStorage);
  }

  create() {
    this.gameOverSound.play();

    const cam = this.cameras.main;
    const cx = cam.scrollX + cam.width / 2;
    const cy = cam.scrollY + cam.height / 2;

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x07060d, 0.6);
    overlay.fillRect(cam.scrollX, cam.scrollY, cam.width + 30, cam.height);

    // Background for text
    const textBackground = this.add.graphics();
    textBackground.fillStyle(0x100e1c, 0.92);
    textBackground.fillRect(cam.scrollX, cy - 62, cam.width + 30, 130);

    // "You died" text
    const gameOverText = this.add
      .text(cx, cy - 36, 'You died', {
        fontSize: '36px',
        color: '#ffffff',
        stroke: '#ff2e88',
        strokeThickness: 4,
        fontFamily: TITLE_FONT,
      })
      .setOrigin(0.5, 0.5);

    // Score text
    const scoreText = this.add
      .text(cx, cy - 4, `Score: ${this.run.score}  |  Best: ${this.best}`, {
        fontSize: '16px',
        color: '#ffe14a',
        fontFamily: TEXT_FONT,
      })
      .setOrigin(0.5, 0.5);

    // Where the score came from
    const [totals, sources] = describeRun(this.run);
    const totalsText = this.add
      .text(cx, cy + 14, totals, { fontSize: '8px', color: '#fff', fontFamily: TEXT_FONT })
      .setOrigin(0.5, 0.5);
    const sourcesText = this.add
      .text(cx, cy + 26, sources, { fontSize: '8px', color: '#a7a1c6', fontFamily: TEXT_FONT })
      .setOrigin(0.5, 0.5);

    // Seed display
    const seedText = this.add
      .text(cx, cy + 40, `Seed: ${this.seedKey}`, {
        fontSize: '8px',
        color: '#a7a1c6',
        fontFamily: TEXT_FONT,
      })
      .setOrigin(0.5, 0.5);

    // How to go on: a touch screen taps, a keyboard presses Space.
    const howToRetry = this.game.device.input.touch
      ? 'Tap to retry'
      : 'Space or click to retry  |  Add Shift for the same seed';
    const clickToContinueText = this.add
      .text(cx, cy + 56, howToRetry, {
        fontSize: '8px',
        color: '#fff',
        fontFamily: TEXT_FONT,
      })
      .setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: clickToContinueText,
      alpha: { from: 1, to: 0 },
      duration: 900,
      yoyo: true,
      loop: -1,
    });

    // Container
    const gameOverTextContainer = this.add.container(0, 0);
    gameOverTextContainer.add([
      textBackground,
      gameOverText,
      scoreText,
      totalsText,
      sourcesText,
      seedText,
      clickToContinueText,
    ]);

    // Click or Space starts a new run; with Shift, the same seed again.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.retry(pointer.event.shiftKey));
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      const choice = retryChoice(event, this.shownMs);
      if (choice) this.retry(choice === 'same-seed');
    });

    this.time.delayedCall(
      5000,
      () => {
        this.gameOverSound.stop();
        this.capibaraSound.play({ loop: true });
      },
      [],
      this
    );
  }

  override update(_time: number, delta: number) {
    this.shownMs += delta;
  }

  /** Starts the next run: a new seed, or this one again. */
  private retry(sameSeed: boolean) {
    if (this.leaving) return;
    this.leaving = true;
    this.gameOverSound.stop();
    this.capibaraSound.stop();
    this.scene.stop(SceneKeys.GAME);
    this.scene.start(SceneKeys.GAME, { seed: sameSeed ? this.seedKey : undefined });
  }
}

export default GameOverScene;
