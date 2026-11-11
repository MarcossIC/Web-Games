import * as Phaser from 'phaser';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { RESTART_HOLD_MS, RunnerEvents, SceneKeys } from '@app/data/services/retrorunner/main';
import HoldBar from '@app/data/services/retrorunner/utils/HoldBar';
import { HoldToConfirm, isFreshPress } from '@app/data/services/retrorunner/utils/hold-to-confirm';
import { Scene } from 'phaser';

const TITLE_FONT = 'Audiowide, sans-serif';
const TEXT_FONT = 'Silkscreen, monospace';

/**
 * Over the paused run: the run is frozen underneath and listens to nothing,
 * so the keys that resume or restart it are read here. Resuming and
 * restarting are the run's own: this only asks for them.
 */
export class PauseScene extends Scene {
  private restartHold!: HoldToConfirm;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private restartBar!: HoldBar;
  /** The R down now was pressed during the pause, not held from before it. */
  private restartPressFresh = false;

  constructor() {
    super(SceneKeys.PAUSE);
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.rectangle(0, 0, width, height, 0x07060d, 0.6).setOrigin(0, 0);
    this.add.rectangle(0, cy - 40, width, 84, 0x100e1c, 0.92).setOrigin(0, 0);
    this.add
      .text(cx, cy - 14, 'Paused', {
        fontSize: '36px',
        color: '#ffffff',
        stroke: '#ff2e88',
        strokeThickness: 4,
        fontFamily: TITLE_FONT,
      })
      .setOrigin(0.5, 0.5);
    const howToGoOn = this.game.device.input.touch
      ? 'Tap pause again to resume'
      : 'Esc or P to resume  |  Hold R for a new run';
    this.add
      .text(cx, cy + 16, howToGoOn, { fontSize: '8px', color: '#fff', fontFamily: TEXT_FONT })
      .setOrigin(0.5, 0.5);
    this.restartBar = new HoldBar(this, cx, cy + 26, 'Restart');

    this.restartHold = new HoldToConfirm(RESTART_HOLD_MS);
    this.restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.restartPressFresh = false;
    this.restartKey?.on(Phaser.Input.Keyboard.Events.DOWN, (_key: unknown, event: KeyboardEvent) => {
      this.restartPressFresh = isFreshPress(event);
    });
    // A key held since before the pause repeats: only a new press resumes.
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Escape' || event.code === 'KeyP') EventBus.emit(RunnerEvents.TOGGLE_PAUSE);
    });
  }

  override update(_time: number, delta: number) {
    const held = (this.restartKey?.isDown ?? false) && this.restartPressFresh;
    if (this.restartHold.update(held, delta)) {
      EventBus.emit(RunnerEvents.RESTART);
      return;
    }
    this.restartBar.setProgress(this.restartHold.progress);
  }
}
