import * as Phaser from 'phaser';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { RESTART_HOLD_MS, RunnerEvents, SceneKeys } from '@app/data/services/retrorunner/main';
import HoldBar from '@app/data/services/retrorunner/utils/HoldBar';
import { HoldToConfirm, isFreshPress, TapTracker } from '@app-input';
import { type HeldKeys, heldKeys, keyPresses } from '@app-input/phaser-input';
import { PAUSE_SCREEN_HELD_KEYS, PAUSE_SCREEN_KEYS } from '@app/data/services/retrorunner/runner-controls';
import PixelKey, { KEY_LOOKS } from '@app/data/services/retrorunner/utils/PixelKey';
import { contains, LAYOUT_CHANGED, layoutOf, Rect } from '@app/data/services/retrorunner/utils/runner-layout';
import { GameObjects, Scene } from 'phaser';

const TITLE_FONT = 'Audiowide, sans-serif';
const TEXT_FONT = 'Silkscreen, monospace';

const COPY_LABEL = 'Copy link';
/** How long the copy button says how the copy went. */
const COPY_ANSWER_MS = 1800;

export type PauseChoice = 'resume' | 'restart' | 'copy' | 'exit';

export interface PauseButton {
  readonly choice: PauseChoice;
  readonly label: string;
  readonly rect: Rect;
}

const BUTTON_WIDTH = 148;
const BUTTON_HEIGHT = 40;
const BUTTON_GAP = 8;

/**
 * The buttons of the pause menu on a touch screen, two by two, centred on
 * `cx` with their first row at `top`. On a phone the page's bar is hidden,
 * so what the bar and the strip under the game did is here: leaving the
 * game and copying the link of the level.
 */
export function pauseMenu(cx: number, top: number): PauseButton[] {
  const left = cx - BUTTON_GAP / 2 - BUTTON_WIDTH;
  const right = cx + BUTTON_GAP / 2;
  const second = top + BUTTON_HEIGHT + BUTTON_GAP;
  const at = (x: number, y: number): Rect => ({ x, y, w: BUTTON_WIDTH, h: BUTTON_HEIGHT });
  return [
    { choice: 'resume', label: 'Resume', rect: at(left, top) },
    { choice: 'restart', label: 'New run', rect: at(right, top) },
    { choice: 'copy', label: COPY_LABEL, rect: at(left, second) },
    { choice: 'exit', label: 'Exit', rect: at(right, second) },
  ];
}

/**
 * Over the paused run: the run is frozen underneath and listens to nothing,
 * so the keys that resume or restart it are read here. Resuming and
 * restarting are the run's own: this only asks for them.
 *
 * With a keyboard it is a line of keys to press. On a touch screen it is a
 * menu of buttons.
 */
export class PauseScene extends Scene {
  private restartHold!: HoldToConfirm;
  private restartKey?: HeldKeys<'restart'>;
  private restartBar?: HoldBar;
  /** The R down now was pressed during the pause, not held from before it. */
  private restartPressFresh = false;
  /** Seed of the paused level, shown on the menu. */
  private seed = '';
  private root?: GameObjects.Container;
  private buttons: { button: PauseButton; view: PixelKey }[] = [];
  private readonly taps = new TapTracker<PauseChoice>(
    (x, y) => this.buttons.find(({ button }) => contains(button.rect, x, y))?.button.choice ?? null
  );

  constructor() {
    super(SceneKeys.PAUSE);
  }

  init(data?: { seed?: string }) {
    this.seed = data?.seed ?? '';
  }

  create() {
    this.draw();
    this.game.events.on(LAYOUT_CHANGED, this.draw, this);
    EventBus.on(RunnerEvents.LINK_COPIED, this.showCopyAnswer, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(LAYOUT_CHANGED, this.draw, this);
      EventBus.off(RunnerEvents.LINK_COPIED, this.showCopyAnswer, this);
    });

    this.restartHold = new HoldToConfirm(RESTART_HOLD_MS);
    this.restartKey = heldKeys(this.input.keyboard, PAUSE_SCREEN_HELD_KEYS);
    this.restartPressFresh = false;
    this.restartKey.onPress('restart', (event) => {
      this.restartPressFresh = isFreshPress(event);
    });
    // A key held since before the pause repeats: only a new press resumes.
    keyPresses(this.input.keyboard, PAUSE_SCREEN_KEYS, () => EventBus.emit(RunnerEvents.TOGGLE_PAUSE));

    // A button acts when the finger comes up on it: nothing is left pressed
    // on the run as it goes on.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.taps.down(pointer.id, pointer.x, pointer.y);
      this.showPressed();
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      const choice = this.taps.up(pointer.id, pointer.x, pointer.y);
      this.showPressed();
      if (choice) this.choose(choice);
    });
  }

  override update(_time: number, delta: number) {
    const held = (this.restartKey?.isDown('restart') ?? false) && this.restartPressFresh;
    if (this.restartHold.update(held, delta)) {
      EventBus.emit(RunnerEvents.RESTART);
      return;
    }
    this.restartBar?.setProgress(this.restartHold.progress);
  }

  /** Draws the screen for the layout in use; again when the phone is turned. */
  private draw() {
    this.root?.destroy();
    this.restartBar?.destroy();
    this.restartBar = undefined;
    this.buttons = [];
    this.taps.clear();

    const { width, height, controls } = layoutOf(this.registry);
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);
    const root = this.add.container(0, 0);
    this.root = root;

    root.add(this.add.rectangle(0, 0, width, height, 0x07060d, 0.6).setOrigin(0, 0));

    if (!controls) {
      root.add(this.add.rectangle(0, cy - 40, width, 84, 0x100e1c, 0.92).setOrigin(0, 0));
      root.add(this.title(cx, cy - 14));
      root.add(this.line(cx, cy + 16, 'Esc or P to resume  |  Hold R for a new run', '#fff'));
      this.restartBar = new HoldBar(this, cx, cy + 26, 'Restart');
      return;
    }

    root.add(this.add.rectangle(0, cy - 96, width, 192, 0x100e1c, 0.92).setOrigin(0, 0));
    root.add(this.title(cx, cy - 66));
    for (const button of pauseMenu(cx, cy - 34)) {
      const look = button.choice === 'resume' ? KEY_LOOKS.primary : KEY_LOOKS.menu;
      const view = new PixelKey(this, button.rect, look, { label: button.label });
      root.add(view.container);
      this.buttons.push({ button, view });
    }
    if (this.seed) root.add(this.line(cx, cy + 76, `Seed: ${this.seed}`, '#a7a1c6'));
  }

  private title(x: number, y: number): GameObjects.Text {
    return this.add
      .text(x, y, 'Paused', {
        fontSize: '36px',
        color: '#ffffff',
        stroke: '#ff2e88',
        strokeThickness: 4,
        fontFamily: TITLE_FONT,
      })
      .setOrigin(0.5, 0.5);
  }

  private line(x: number, y: number, text: string, color: string): GameObjects.Text {
    return this.add.text(x, y, text, { fontSize: '8px', color, fontFamily: TEXT_FONT }).setOrigin(0.5, 0.5);
  }

  private showPressed() {
    for (const { button, view } of this.buttons) view.setPressed(this.taps.isPressed(button.choice));
  }

  private choose(choice: PauseChoice) {
    switch (choice) {
      case 'resume':
        EventBus.emit(RunnerEvents.TOGGLE_PAUSE);
        break;
      case 'restart':
        EventBus.emit(RunnerEvents.RESTART);
        break;
      case 'copy':
        EventBus.emit(RunnerEvents.COPY_LINK);
        break;
      case 'exit':
        EventBus.emit(RunnerEvents.EXIT);
        break;
    }
  }

  /** The page copied the link, or could not: the button says so for a moment. */
  private showCopyAnswer(copied: boolean) {
    this.setCopyLabel(copied ? 'Copied' : 'Not copied');
    this.time.delayedCall(COPY_ANSWER_MS, () => this.setCopyLabel(COPY_LABEL));
  }

  private setCopyLabel(label: string) {
    this.buttons.find(({ button }) => button.choice === 'copy')?.view.setLabel(label);
  }
}
