import * as Phaser from 'phaser';
import {
  RetroRunnerMedia,
} from '@app/data/models/retro-runner/RetroRunnerKeys';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { PhaserSound } from '@app/data/services/phaser/types';
import { RunnerEvents, SceneKeys } from '@app/data/services/retrorunner/main';
import PixelKey, { KEY_LOOKS } from '@app/data/services/retrorunner/utils/PixelKey';
import { formatRunTime, RunSummary } from '@app/data/services/retrorunner/utils/run-score';
import { runnerRecords } from '@app/data/services/retrorunner/runner-saves';
import { browserStore, keepBest, type KeyValueStore } from '@app-persistence';
import { contains, LAYOUT_CHANGED, layoutOf, Rect } from '@app/data/services/retrorunner/utils/runner-layout';
import { TapTracker } from '@app/data/services/retrorunner/utils/touch-pad';
import { GameObjects, Scene } from 'phaser';

// The typefaces of the site. Silkscreen is a pixel face with a 8px grid:
// sizes that are multiples of 8 stay sharp when the picture is enlarged.
const TITLE_FONT = 'Audiowide, sans-serif';
const TEXT_FONT = 'Silkscreen, monospace';
/**
 * Space, or a finger, starts the next run only after the screen has been up
 * this long: a jump pressed while falling would otherwise skip the screen.
 */
const RETRY_ARMED_AFTER_MS = 600;
/** Under this width the score and the best score do not fit one line. */
const NARROW_BELOW = 440;

/** What a button of the screen asks for, on a touch screen. */
export type GameOverChoice = 'same-seed' | 'exit';

export interface GameOverButton {
  readonly choice: GameOverChoice;
  readonly label: string;
  readonly rect: Rect;
}

/**
 * The two buttons under the summary on a touch screen, centred on `cx`.
 * A tap anywhere else is a new run; these are what a keyboard does with
 * Shift (the same level again) and what the page's hidden bar did (leave).
 */
export function gameOverButtons(cx: number, top: number): GameOverButton[] {
  const width = 148;
  const height = 36;
  const gap = 8;
  return [
    { choice: 'same-seed', label: 'Same seed', rect: { x: cx - gap / 2 - width, y: top, w: width, h: height } },
    { choice: 'exit', label: 'Exit', rect: { x: cx + gap / 2, y: top, w: width, h: height } },
  ];
}

/** The screen has been up long enough for a press on it to be meant. */
export function isRetryArmed(shownForMs: number): boolean {
  return shownForMs >= RETRY_ARMED_AFTER_MS;
}

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
  if (key.repeat || !isRetryArmed(shownForMs)) return null;
  return key.shiftKey ? 'same-seed' : 'new-seed';
}

/** Keeps `score` if it beats the best one, and returns the best. */
export function recordBest(score: number, store: KeyValueStore): number {
  const best = keepBest(runnerRecords.read(store).bestScore, score, 'higher');
  if (best.improved) runnerRecords.write(store, { bestScore: best.value });
  return best.value;
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
  private root?: GameObjects.Container;
  private blinking?: GameObjects.Text;
  private buttons: { button: GameOverButton; view: PixelKey }[] = [];
  private readonly taps = new TapTracker<GameOverChoice>(
    (x, y) => this.buttons.find(({ button }) => contains(button.rect, x, y))?.button.choice ?? null
  );
  /**
   * The fingers that went down once the screen was armed, and whether each
   * started on a button. A thumb still on the jump key as the run ends is
   * not in it: lifting it does nothing.
   */
  private readonly fingers = new Map<number, { onButton: boolean }>();

  constructor() {
    super(SceneKeys.GAME_OVER);
  }

  init(data: { run?: RunSummary; seed?: string }) {
    this.leaving = false;
    this.shownMs = 0;
    this.fingers.clear();
    this.run = data?.run ?? EMPTY_RUN;
    this.seedKey = data?.seed ?? '';

    this.gameOverSound = this.sound.add(RetroRunnerMedia.GAMEOVER_SOUND, {
      volume: 0.2,
    });
    this.capibaraSound = this.sound.add(RetroRunnerMedia.CAPIBARA_SOUND, {
      volume: 0.2,
    });

    this.best = recordBest(this.run.score, browserStore());
  }

  create() {
    this.gameOverSound.play();

    this.draw();
    this.game.events.on(LAYOUT_CHANGED, this.draw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(LAYOUT_CHANGED, this.draw, this);
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.pressed(pointer));
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => this.released(pointer));
    // Space starts a new run; with Shift, the same seed again.
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

  /** Draws the screen for the layout in use; again when the phone is turned. */
  private draw() {
    if (this.blinking) this.tweens.killTweensOf(this.blinking);
    this.root?.destroy();
    this.buttons = [];
    this.taps.clear();

    const { width, height, controls } = layoutOf(this.registry);
    const touch = controls !== null;
    const narrow = width < NARROW_BELOW;
    const cx = Math.round(width / 2);
    // The buttons of a touch screen go under the summary: it moves up.
    const cy = Math.round(height / 2) - (touch ? 28 : 0);
    // A narrow screen gives the best score a line of its own.
    const shift = narrow ? 18 : 0;

    const root = this.add.container(0, 0);
    this.root = root;

    // Overlay
    root.add(this.add.rectangle(0, 0, width, height, 0x07060d, 0.6).setOrigin(0, 0));

    // Background for text
    const bandHeight = touch ? 190 + shift : 130;
    root.add(this.add.rectangle(0, cy - 62, width, bandHeight, 0x100e1c, 0.92).setOrigin(0, 0));

    // "You died" text
    root.add(
      this.add
        .text(cx, cy - 36, 'You died', {
          fontSize: '36px',
          color: '#ffffff',
          stroke: '#ff2e88',
          strokeThickness: 4,
          fontFamily: TITLE_FONT,
        })
        .setOrigin(0.5, 0.5)
    );

    // Score text
    const big = { fontSize: '16px', color: '#ffe14a', fontFamily: TEXT_FONT };
    if (narrow) {
      root.add(this.add.text(cx, cy - 4, `Score: ${this.run.score}`, big).setOrigin(0.5, 0.5));
      root.add(this.add.text(cx, cy + 14, `Best: ${this.best}`, big).setOrigin(0.5, 0.5));
    } else {
      root.add(
        this.add.text(cx, cy - 4, `Score: ${this.run.score}  |  Best: ${this.best}`, big).setOrigin(0.5, 0.5)
      );
    }

    // Where the score came from, and the seed
    const [totals, sources] = describeRun(this.run);
    root.add(this.line(cx, cy + 14 + shift, totals, '#fff'));
    root.add(this.line(cx, cy + 26 + shift, sources, '#a7a1c6'));
    root.add(this.line(cx, cy + 40 + shift, `Seed: ${this.seedKey}`, '#a7a1c6'));

    // How to go on: a touch screen taps, a keyboard presses Space.
    // On a phone a game pixel is about a CSS pixel: the call to go on is
    // written twice as big there.
    this.blinking = touch
      ? this.add
          .text(cx, cy + 62 + shift, 'Tap to retry', { fontSize: '16px', color: '#fff', fontFamily: TEXT_FONT })
          .setOrigin(0.5, 0.5)
      : this.line(cx, cy + 56 + shift, 'Space or click to retry  |  Add Shift for the same seed', '#fff');
    root.add(this.blinking);
    this.tweens.add({
      targets: this.blinking,
      alpha: { from: 1, to: 0 },
      duration: 900,
      yoyo: true,
      loop: -1,
    });

    if (!touch) return;
    for (const button of gameOverButtons(cx, cy + 82 + shift)) {
      const view = new PixelKey(this, button.rect, KEY_LOOKS.menu, { label: button.label });
      root.add(view.container);
      this.buttons.push({ button, view });
    }
  }

  private line(x: number, y: number, text: string, color: string): GameObjects.Text {
    return this.add.text(x, y, text, { fontSize: '8px', color, fontFamily: TEXT_FONT }).setOrigin(0.5, 0.5);
  }

  private pressed(pointer: Phaser.Input.Pointer) {
    // With a mouse a click starts a new run at once; with Shift, the same seed.
    if (!layoutOf(this.registry).controls) {
      this.retry(pointer.event.shiftKey);
      return;
    }
    if (!isRetryArmed(this.shownMs)) return;
    const onButton = this.taps.down(pointer.id, pointer.x, pointer.y) !== null;
    this.fingers.set(pointer.id, { onButton });
    this.showPressed();
  }

  /**
   * On a touch screen everything acts as the finger comes up, so the next
   * run starts with no key pressed: a button does its own thing, and a tap
   * anywhere else starts a new run.
   */
  private released(pointer: Phaser.Input.Pointer) {
    const finger = this.fingers.get(pointer.id);
    if (!finger) return;
    this.fingers.delete(pointer.id);
    const choice = this.taps.up(pointer.id, pointer.x, pointer.y);
    this.showPressed();

    if (choice === 'exit') this.exit();
    else if (choice === 'same-seed') this.retry(true);
    // A finger that slid off a button changed its mind: it is not a retry.
    else if (!finger.onButton) this.retry(false);
  }

  private showPressed() {
    for (const { button, view } of this.buttons) view.setPressed(this.taps.isPressed(button.choice));
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

  /** Leaves the game: the page takes the player back to the list of games. */
  private exit() {
    if (this.leaving) return;
    this.leaving = true;
    this.gameOverSound.stop();
    this.capibaraSound.stop();
    EventBus.emit(RunnerEvents.EXIT);
  }
}

export default GameOverScene;
