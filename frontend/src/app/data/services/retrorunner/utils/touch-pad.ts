import { contains, TouchControls } from './runner-layout';

/** What the keys on the screen ask of the capybara right now. */
export interface PadState {
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
}

/** What `readPad` needs from a finger: Phaser's pointers have it. */
export interface Finger {
  readonly isDown: boolean;
  readonly x: number;
  readonly y: number;
}

export function idlePad(): PadState {
  return { left: false, right: false, jump: false, crouch: false };
}

/**
 * Which keys are held, from where the fingers are now.
 *
 * It is read from scratch on every frame, with no memory of presses and
 * releases: a finger that slides from one arrow to the other turns around
 * without lifting, and a release the game never heard of (a finger lifted
 * during a pause, a touch the system cancelled) cannot leave a key stuck.
 * `out` is filled and returned, so nothing is allocated per frame.
 */
export function readPad(controls: TouchControls | null, fingers: readonly Finger[], out: PadState): PadState {
  out.left = false;
  out.right = false;
  out.jump = false;
  out.crouch = false;
  if (!controls) return out;

  for (let i = 0; i < fingers.length; i++) {
    const finger = fingers[i];
    if (!finger.isDown) continue;
    const { x, y } = finger;
    if (contains(controls.left.zone, x, y)) out.left = true;
    else if (contains(controls.right.zone, x, y)) out.right = true;
    else if (contains(controls.jump.zone, x, y)) out.jump = true;
    else if (contains(controls.crouch.zone, x, y)) out.crouch = true;
  }
  return out;
}

/**
 * Taps on buttons: a finger that goes down on a button and comes up on the
 * same one. Sliding off before lifting cancels it, as on any button, and a
 * button acts on the release: no finger is left down on whatever comes next.
 */
export class TapTracker<Key> {
  /** The button each finger went down on. */
  private readonly started = new Map<number, Key>();

  /** `hit` says which button, if any, is at a point. */
  constructor(private readonly hit: (x: number, y: number) => Key | null) {}

  /** A finger went down. Returns the button under it, if any. */
  down(finger: number, x: number, y: number): Key | null {
    const key = this.hit(x, y);
    if (key === null) this.started.delete(finger);
    else this.started.set(finger, key);
    return key;
  }

  /** A finger came up. Returns the button it tapped, if it did. */
  up(finger: number, x: number, y: number): Key | null {
    const key = this.started.get(finger);
    this.started.delete(finger);
    if (key === undefined) return null;
    return this.hit(x, y) === key ? key : null;
  }

  /** A finger that started on `key` is still down. */
  isPressed(key: Key): boolean {
    for (const pressed of this.started.values()) {
      if (pressed === key) return true;
    }
    return false;
  }

  /** Forgets every finger: the buttons moved, or are gone. */
  clear(): void {
    this.started.clear();
  }
}
