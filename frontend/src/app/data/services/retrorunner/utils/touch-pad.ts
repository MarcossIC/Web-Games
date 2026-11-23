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
