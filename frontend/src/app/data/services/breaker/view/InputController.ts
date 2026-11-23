import * as Phaser from 'phaser';
import { WORLD } from '../engine/config';
import type { BreakerInput, Paddle } from '../engine/types';
import { type HudZone, hudZoneAt } from './board-layout';
import { startsAsTouch } from '@app-input';
import { type InputAction, InputState, lockedTargetX } from './input-state';

/** KeyboardEvent.code -> action. Codes, not keys: the same places on any layout. */
const KEY_ACTIONS: Readonly<Record<string, InputAction>> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'fire',
  ShiftLeft: 'overdrive',
  ShiftRight: 'overdrive',
  KeyE: 'overdrive',
};

/** Space and the arrows would scroll the page; they are only captured while the run is on. */
const CAPTURED = [
  Phaser.Input.Keyboard.KeyCodes.SPACE,
  Phaser.Input.Keyboard.KeyCodes.LEFT,
  Phaser.Input.Keyboard.KeyCodes.RIGHT,
  Phaser.Input.Keyboard.KeyCodes.UP,
  Phaser.Input.Keyboard.KeyCodes.DOWN,
];

/** The touch HUD of a tall board: where it is on the canvas and what its Pause button does. */
export interface TouchHud {
  /** Rows above the world: pointer.y is canvas y, the HUD zones are in world y. */
  extra: number;
  onPause: () => void;
}

/**
 * Phaser pointer and keyboard events -> InputState. P, Esc and M are the
 * page's (BreakerControllerService.handleKey): this never reads them, so
 * mute has exactly one owner. Handlers are named and removed in destroy().
 */
export class InputController {
  /** Finger touch is relative to the paddle: it asks for where the paddle is and how wide. */
  readonly state = new InputState(() => this.paddle());
  /** Pointers whose press started on a HUD zone: the button fires when the same one lets go on it. */
  private readonly hudPress = new Map<number, HudZone>();
  private capturing = false;
  /** The last pointer that pressed was a finger; before any press, what the device suggests. */
  touch = startsAsTouch(typeof window === 'undefined' ? undefined : window);
  /**
   * The steering target while the mouse is locked to the canvas (the page's
   * CanvasPointerLock): pointer.x stands still then, only movementX arrives.
   * Null until the first locked move, which starts from the paddle.
   */
  private lockedX: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Called on every press: the audio unlock (cheap after the first). */
    private readonly onGesture: () => void,
    /** The paddle the locked target starts from and is held within. */
    private readonly paddle: () => Readonly<Paddle>,
    /** Tall boards only: a press on the HUD is a button or nothing, never steering nor a launch. */
    private readonly hud: TouchHud | null = null
  ) {
    const input = scene.input;
    // Phaser has one touch pointer by default: a second finger (the Overdrive tap) needs its own.
    input.addPointer(1);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKeyDown, this);
    input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_UP, this.onKeyUp, this);
  }

  sample(): BreakerInput {
    return this.state.sample();
  }

  /** Captures Space and the arrows while playing, and lets the page have them otherwise (dialog buttons). */
  setCapture(on: boolean): void {
    const keyboard = this.scene.input.keyboard;
    if (on === this.capturing || !keyboard) return;
    this.capturing = on;
    if (on) keyboard.addCapture(CAPTURED);
    else keyboard.removeCapture(CAPTURED);
  }

  releaseAll(): void {
    this.state.releaseAll();
    this.hudPress.clear();
    // A pause or a restart ends the lock: the next one starts again from the paddle.
    this.lockedX = null;
  }

  destroy(): void {
    const input = this.scene.input;
    this.setCapture(false);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKeyDown, this);
    input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_UP, this.onKeyUp, this);
  }

  // pointer.x is in game pixels (960x720), the engine's world: it does not
  // depend on the camera, so the slow-motion zoom never shifts the steering.
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.locked) {
      const paddle = this.paddle();
      const half = paddle.w / 2;
      // movementX is in CSS px; displayScale turns it into game px, like pointer.x.
      const dx = pointer.movementX * this.scene.scale.displayScale.x;
      this.lockedX = lockedTargetX(
        this.lockedX ?? paddle.x,
        dx,
        WORLD.LEFT_WALL_X + half,
        WORLD.RIGHT_WALL_X - half
      );
      this.state.pointerMove(this.lockedX, false, pointer.id);
      return;
    }
    this.lockedX = null;
    this.state.pointerMove(pointer.x, pointer.wasTouch, pointer.id);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.onGesture();
    this.touch = pointer.wasTouch;
    const zone = this.hudZone(pointer);
    if (zone) this.hudPress.set(pointer.id, zone);
    this.state.pointerDown(this.pointerX(pointer), pointer.wasTouch, pointer.downTime, pointer.id, zone !== null);
  }

  /** The HUD zone under the pointer, null on the play field (and always under a mouse lock, which has no cursor). */
  private hudZone(pointer: Phaser.Input.Pointer): HudZone | null {
    if (!this.hud || pointer.locked) return null;
    return hudZoneAt(pointer.x, pointer.y - this.hud.extra, true);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const pressed = this.hudPress.get(pointer.id);
    if (pressed) {
      this.hudPress.delete(pointer.id);
      this.state.pointerUp(pointer.x, pointer.wasTouch, pointer.upTime, pointer.id);
      // A button fires on release, and only if the finger is still on it.
      if (this.hudZone(pointer) !== pressed) return;
      if (pressed === 'pause') this.hud?.onPause();
      else if (pressed === 'nova') this.state.requestOverdrive();
      return;
    }
    this.state.pointerUp(this.pointerX(pointer), pointer.wasTouch, pointer.upTime, pointer.id);
  }

  /** Under a lock pointer.x is where the cursor froze: a click there would yank the paddle. */
  private pointerX(pointer: Phaser.Input.Pointer): number {
    return pointer.locked ? (this.lockedX ?? this.paddle().x) : pointer.x;
  }

  private onKeyDown(event: KeyboardEvent): void {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    this.onGesture();
    // A keyboard on a touch screen (a tablet with a cover): speak of keys from now on.
    this.touch = false;
    if (event.repeat) return;
    this.state.keyDown(action);
  }

  private onKeyUp(event: KeyboardEvent): void {
    const action = KEY_ACTIONS[event.code];
    if (action) this.state.keyUp(action);
  }
}
