import { contains, idleStickPush, type StickFinger, type StickPush, stickPush } from '@app-input';
import { TouchControls } from './runner-layout';

export type { StickFinger as Finger } from '@app-input';

/**
 * What the fingers ask of the capybara right now. There are no keys on the
 * screen: the left thumb lands anywhere on its half and becomes a stick
 * (slide sideways to run, up to jump, down to crouch), and a finger on the
 * right half jumps for as long as it stays down (a tap is a short hop).
 */
export interface PadState {
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
}

/** How far the knob travels from where the thumb landed, in game pixels. */
export const STICK_RADIUS = 34;
/** Sideways slide before the capybara runs: a resting thumb shakes. */
export const STICK_DEAD = 8;
/** Slide up that jumps. */
export const STICK_JUMP = 22;
/** Slide down that crouches, when it is more down than sideways. */
export const STICK_CROUCH = 18;

/** The stick as it is drawn: where it sits and where its knob is. */
export interface StickView {
  /** A thumb holds it. */
  active: boolean;
  baseX: number;
  baseY: number;
  push: StickPush;
}

export function idlePad(): PadState {
  return { left: false, right: false, jump: false, crouch: false };
}

export function idleStick(): StickView {
  return { active: false, baseX: 0, baseY: 0, push: idleStickPush() };
}

/** Kept between calls so a frame allocates nothing when no view is asked for. */
const SCRATCH = idleStick();

/**
 * What the fingers hold, from where they are now and where they landed.
 *
 * Each finger belongs to the half it landed on, wherever it slides after:
 * a thumb that drifts across the middle while running stays the stick. The
 * first finger on the left half is the stick; any other finger, on either
 * half, jumps. A finger that landed on pause does nothing here.
 *
 * Read from scratch every frame, like the keys were: nothing can be left
 * stuck. `out` (and `stick`, when given) are filled and returned.
 */
export function readPad(
  controls: TouchControls | null,
  fingers: readonly StickFinger[],
  out: PadState,
  stick: StickView = SCRATCH
): PadState {
  out.left = out.right = out.jump = out.crouch = false;
  stick.active = false;
  if (!controls) return out;

  for (const finger of fingers) {
    if (!finger.isDown) continue;
    const { downX, downY } = finger;
    if (contains(controls.pause.zone, downX, downY)) continue;

    if (!stick.active && contains(controls.stick.zone, downX, downY)) {
      stick.active = true;
      stick.baseX = downX;
      stick.baseY = downY;
      const { dx, dy } = stickPush(finger, STICK_RADIUS, stick.push);
      if (dx <= -STICK_DEAD) out.left = true;
      if (dx >= STICK_DEAD) out.right = true;
      if (dy <= -STICK_JUMP) out.jump = true;
      if (dy >= STICK_CROUCH && dy > Math.abs(dx)) out.crouch = true;
      continue;
    }

    // A second finger, or one on the right half: jump while it stays down.
    if (contains(controls.stick.zone, downX, downY) || contains(controls.jump.zone, downX, downY)) {
      out.jump = true;
    }
  }
  return out;
}
